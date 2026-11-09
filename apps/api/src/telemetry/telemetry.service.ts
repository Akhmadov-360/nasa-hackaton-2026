import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  appendEvent, computeFrame, diffAlerts,
  type Alert, type EngineConfig, type EngineEvent, type EventType, type ModifiersConfig, type RadiationConfig,
  type ScenarioPack, type Status, type TelemetryFrame, type Thresholds,
} from '@astro/engine';
import pack from '@astro/data/packs/demo.pack.json';
import thresholds from '@astro/data/thresholds.json';
import modifiers from '@astro/data/modifiers.json';
import radiation from '@astro/data/radiation-model.json';

export interface TickResult { t: number; frames: TelemetryFrame[]; alerts: Alert[] }
export interface ServiceOptions { metOffsetSec?: number; now?: () => number }

const EVENT_TYPES: EventType[] = ['flare', 'exertion', 'o2fault', 'normalize'];

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
    const t = Number.isFinite(e.t) ? Number(e.t) : this.nowT();
    this.log = appendEvent(this.log, { t, type: e.type as EventType, crewId: String(e.crewId), params: e.params });
    return { ok: true };
  }

  snapshot() {
    return {
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
