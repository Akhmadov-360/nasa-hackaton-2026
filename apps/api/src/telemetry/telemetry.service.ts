import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  appendEvent, computeFrame, diffAlerts, isManualMetric, MANUAL, validManualValue,
  type Alert, type EngineConfig, type EngineEvent, type EventType, type ModifiersConfig, type RadiationConfig,
  type ScenarioPack, type Status, type TelemetryFrame, type Thresholds,
} from '@astro/engine';
import pack from '@astro/data/packs/demo.pack.json';
import thresholds from '@astro/data/thresholds.json';
import modifiers from '@astro/data/modifiers.json';
import radiation from '@astro/data/radiation-model.json';

export interface TickResult { t: number; frames: TelemetryFrame[]; alerts: Alert[] }
export interface ServiceOptions { metOffsetSec?: number; now?: () => number }

const EVENT_TYPES: EventType[] = ['flare', 'exertion', 'o2fault', 'normalize', 'measurement'];
const MAX_EVENTS = 300;
const MAX_INTENSITY = 3;
const MAX_MAGNITUDE = 20;

export class TelemetryService {
  private readonly cfgBase = {
    pack: pack as unknown as ScenarioPack,
    thresholds: thresholds as unknown as Thresholds,
    modifiers: modifiers as unknown as ModifiersConfig,
    radiation: radiation as unknown as RadiationConfig,
  };
  private log: EngineEvent[] = [];
  private prevStatus: Record<string, Record<string, Status>> = {};
  private prevFrame: Record<string, TelemetryFrame> = {};
  /** changes on every server start; clients use it to drop state that belongs to an older run */
  readonly sessionId = Math.random().toString(36).slice(2, 10);
  private readonly startMs: number;
  private readonly offset: number;
  private readonly now: () => number;

  constructor(opts: ServiceOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.startMs = this.now();
    this.offset = opts.metOffsetSec ?? Number(process.env.MET_OFFSET_SEC ?? 3 * 86400 + 12 * 3600);
  }

  private get cfg(): EngineConfig {
    return { ...this.cfgBase, log: this.log };
  }

  /** Mission Elapsed Time in seconds, quantised to the 10 Hz tick. */
  nowT(): number {
    return this.offset + Math.floor(((this.now() - this.startMs) / 1000) * 10) / 10;
  }

  get crewIds(): string[] {
    return this.cfgBase.pack.crew.map((c) => c.id);
  }

  tick(t: number = this.nowT()): TickResult {
    const frames: TelemetryFrame[] = [];
    const alerts: Alert[] = [];
    for (const id of this.crewIds) {
      const f = computeFrame(this.cfg, id, t, this.prevStatus[id]);
      alerts.push(...diffAlerts(this.prevFrame[id], f, this.cfgBase.thresholds));
      this.prevStatus[id] = f.status.byMetric;
      this.prevFrame[id] = f;
      frames.push(f);
    }
    return { t, frames, alerts };
  }

  /** Like tick() but does not advance alert/status state (used by the REST polling endpoint). */
  peek(t: number = this.nowT()): { t: number; frames: TelemetryFrame[] } {
    const frames = this.crewIds.map((id) => computeFrame(this.cfg, id, t, this.prevStatus[id]));
    return { t, frames };
  }

  reset(): void {
    this.log = [];
    this.prevStatus = {};
    this.prevFrame = {};
  }

  /** Validates and appends an operator command. Never throws. */
  command(raw: unknown): { ok: boolean; error?: string } {
    const e = raw as Partial<EngineEvent> | null;
    if (!e || typeof e !== 'object') return { ok: false, error: 'not an object' };
    if (!EVENT_TYPES.includes(e.type as EventType)) return { ok: false, error: 'unknown type' };
    if (e.crewId !== 'ALL' && !this.crewIds.includes(String(e.crewId))) return { ok: false, error: 'unknown crewId' };
    const cls = e.params?.class;
    if (e.type === 'flare' && cls !== undefined && !(String(cls) in this.cfgBase.radiation.classes)) {
      return { ok: false, error: 'unknown flare class' };
    }
    const params: Record<string, number | string> = {};
    const intensity = e.params?.intensity;
    if (intensity !== undefined) {
      if (typeof intensity !== 'number' || !Number.isFinite(intensity) || intensity < 0 || intensity > MAX_INTENSITY) {
        return { ok: false, error: 'intensity must be a number between 0 and ' + MAX_INTENSITY };
      }
      params.intensity = intensity;
    }
    const magnitude = e.params?.magnitude;
    if (magnitude !== undefined) {
      if (typeof magnitude !== 'number' || !Number.isFinite(magnitude) || magnitude < 0 || magnitude > MAX_MAGNITUDE) {
        return { ok: false, error: 'magnitude must be a number between 0 and ' + MAX_MAGNITUDE };
      }
      params.magnitude = magnitude;
    }
    if (cls !== undefined) params.class = String(cls);
    if (e.type === 'measurement') {
      // self-check entry: one crew member, a known metric and a value inside its range; nothing else is kept
      if (e.crewId === 'ALL') return { ok: false, error: 'a measurement belongs to one crew member' };
      const metric = e.params?.metric;
      if (!isManualMetric(metric)) return { ok: false, error: 'unknown measurement metric' };
      const value = e.params?.value;
      if (!validManualValue(metric, value)) return { ok: false, error: `value for ${metric} must be a number from ${MANUAL[metric].min} to ${MANUAL[metric].max}${MANUAL[metric].integer ? ' (whole number)' : ''}` };
      params.metric = metric;
      params.value = value;
    }
    if (e.t !== undefined && !Number.isFinite(e.t)) return { ok: false, error: 'invalid time' };
    if (this.log.length >= MAX_EVENTS) return { ok: false, error: 'event log full, reset the scenario' };
    const t = Number.isFinite(e.t) ? Number(e.t) : this.nowT();
    this.log = appendEvent(this.log, {
      t, type: e.type as EventType, crewId: String(e.crewId), ...(Object.keys(params).length ? { params } : {}),
    });
    return { ok: true };
  }

  snapshot() {
    return {
      sessionId: this.sessionId,
      t: this.nowT(),
      log: this.log,
      crew: this.cfgBase.pack.crew,
      meta: this.cfgBase.pack.meta,
      thresholdsProvisional: !!this.cfgBase.thresholds.provisional,
    };
  }

  flares(): unknown[] {
    const p = join(__dirname, '..', '..', '..', '..', 'packages', 'data', 'events', 'donki-flares.json');
    return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : [];
  }
}
