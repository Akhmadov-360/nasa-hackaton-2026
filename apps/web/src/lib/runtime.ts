import { sileo } from 'sileo';
import type { Alert, EngineEvent, EventType, Status } from '@astro/engine';
import { enableAudio } from './audio';
import { apiBase, wsUrl } from './constants';
import { notifyAlert } from './alerts/alertCenter';
import { crewName } from './engineConfig';
import { STATUS_RANK } from './metrics';
import { PollSource } from './sources/PollSource';
import { SimSource } from './sources/SimSource';
import { SourceManager, type ManagerEvent } from './sources/SourceManager';
import { WebSocketSource } from './sources/WebSocketSource';
import { useMissionStore } from './store/missionStore';
import { pushFrame, resetBus } from './telemetryBus';

let manager: SourceManager | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let lastStoreUpdate = 0;
const lastOverall: Record<string, Status> = {};

const st = () => useMissionStore.getState();

function handle(e: ManagerEvent): void {
  if (e.type === 'mode') {
    st().setMode(e.mode, e.everLive);
    resetBus();
    const text =
      e.mode === 'LIVE' ? 'Live telemetry link established'
      : e.mode === 'SIM' ? 'Signal lost: switched to onboard simulation'
      : e.mode === 'POLL' ? 'WebSocket down: polling over HTTP'
      : 'Telemetry stream interrupted';
    st().addAudit({ t: st().t, kind: 'link', severity: e.mode === 'LIVE' ? 'NOMINAL' : 'WARNING', text });
    if (e.mode === 'SIM') sileo.warning({ title: 'Signal lost', description: 'Using estimated telemetry (onboard simulation).' });
    if (e.mode === 'LIVE' && e.everLive) sileo.success({ title: 'Link restored', description: 'Live telemetry resumed.' });
    return;
  }
  if (e.type === 'hello') {
    st().setEvents(e.log);
    return;
  }

  for (const f of e.frames) pushFrame(f);

  // React state at <= 4 Hz, immediately when any crew member's overall status changes
  const now = Date.now();
  const changed = e.frames.some((f) => lastOverall[f.crewId] !== f.status.overall);
  for (const f of e.frames) lastOverall[f.crewId] = f.status.overall;
  if (changed || now - lastStoreUpdate >= 250) {
    lastStoreUpdate = now;
    st().applyFrames(e.t, e.frames, e.degraded);
  }

  // one toast per crew member per batch (the worst alert); everything goes to the flight log
  const worst = new Map<string, Alert>();
  for (const a of e.alerts) {
    const cur = worst.get(a.crewId);
    if (!cur || STATUS_RANK[a.severity] > STATUS_RANK[cur.severity]) worst.set(a.crewId, a);
  }
  for (const a of e.alerts) {
    const loud = worst.get(a.crewId) === a;
    if (loud) {
      notifyAlert(a, logAlert); // toast + sound + voice + log
      if (STATUS_RANK[a.severity] >= STATUS_RANK.WARNING) st().setIsland(a);
    } else {
      logAlert(a); // secondary alerts of the same crew member: log only
    }
  }
}

function logAlert(a: Alert): void {
  st().addAudit({
    t: a.t, kind: 'alert', severity: a.severity,
    text: `${crewName(a.crewId)}: ${a.message}`,
  });
}

/** Called once, from the "Enter Mission Control" click (a user gesture, so audio can start). */
export function startRuntime(): void {
  if (manager) return;
  enableAudio();
  const live = new WebSocketSource(wsUrl);
  const poll = new PollSource(apiBase);
  const sim = new SimSource();
  manager = new SourceManager({ live, poll, sim });
  manager.subscribe(handle);
  manager.start();
  timer = setInterval(() => manager?.tick(), 500);
  st().enter();
  st().addAudit({ t: st().t, kind: 'system', text: 'Mission Control session started' });
}

export function stopRuntime(): void {
  clearInterval(timer);
  manager?.stop();
  manager = null;
}

const COMMAND_TEXT: Record<EventType, string> = {
  flare: 'Solar flare event injected',
  exertion: 'Physical exertion scenario started',
  o2fault: 'O2 supply fault injected',
  normalize: 'Normalize command issued',
};

/** Operator command from the Control Deck. The event time is stamped here so server and browser agree. */
export function sendCommand(type: EventType, crewId: string, params?: Record<string, number | string>): void {
  const t = Math.round(st().t * 10) / 10;
  const ev: EngineEvent = { t, type, crewId, ...(params ? { params } : {}) };
  st().addEvent(ev);
  st().addAudit({
    t, kind: 'command',
    text: `${COMMAND_TEXT[type]} (${crewId === 'ALL' ? 'all crew' : crewName(crewId)})`,
  });
  manager?.command(ev);
}
