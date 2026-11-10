import { sileo } from 'sileo';
import type { Alert, EngineEvent, EventType, Status } from '@astro/engine';
import { enableAudio } from './audio';
import { apiBase, wsUrl } from './constants';
import { notifyAlert } from './alerts/alertCenter';
import { crewName } from './engineConfig';
import { tr, type DictKey } from './i18n';
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
    st().addAudit({
      t: st().t, kind: 'link', severity: e.mode === 'LIVE' ? 'NOMINAL' : 'WARNING', key: `log.link.${e.mode}` as DictKey,
    });
    if (e.mode === 'SIM') sileo.warning({ title: tr('banner.sim'), duration: 5000 });
    if (e.mode === 'LIVE' && e.everLive) sileo.success({ title: tr('log.link.LIVE'), duration: 3000 });
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
    if (worst.get(a.crewId) === a) {
      notifyAlert(a, logAlert); // toast + sound + voice + log
      if (STATUS_RANK[a.severity] >= STATUS_RANK.WARNING) st().setIsland(a);
    } else {
      logAlert(a); // secondary alerts of the same crew member: log only
    }
  }
}

function logAlert(a: Alert): void {
  st().addAudit({
    t: a.t, kind: 'alert', severity: a.severity, key: 'log.alert',
    crewId: a.crewId, metric: a.metric, value: a.value, unit: a.unit,
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
  st().addAudit({ t: st().t, kind: 'system', key: 'log.system.start' });
}

export function stopRuntime(): void {
  clearInterval(timer);
  manager?.stop();
  manager = null;
}

const COMMAND_KEY: Record<EventType, DictKey> = {
  flare: 'log.cmd.flare',
  exertion: 'log.cmd.exertion',
  o2fault: 'log.cmd.o2fault',
  normalize: 'log.cmd.normalize',
};

/** Operator command from the Control Deck. The event time is stamped here so server and browser agree. */
export function sendCommand(type: EventType, crewId: string, params?: Record<string, number | string>): void {
  const t = Math.round(st().t * 10) / 10;
  if (t <= 0) return; // no telemetry yet: nothing to act on
  const ev: EngineEvent = { t, type, crewId, ...(params ? { params } : {}) };
  st().addEvent(ev);
  st().addAudit({ t, kind: 'command', key: COMMAND_KEY[type], params: { crewId } });
  manager?.command(ev);
  // micro-action: undo for crew-specific commands
  if (type === 'exertion' || type === 'o2fault') {
    sileo.info({
      title: tr(type === 'exertion' ? 'deck.exertion' : 'deck.o2'),
      description: crewName(crewId),
      duration: 6000,
      button: { title: tr('deck.undo'), onClick: () => sendCommand('normalize', crewId) },
    });
  }
}

/** Clears injected events on the server and in this browser. */
export function resetScenario(): void {
  const t = Math.round(st().t * 10) / 10;
  st().clearEvents();
  st().setTimeTravel(null);
  st().addAudit({ t, kind: 'command', key: 'log.cmd.reset' });
  void fetch(`${apiBase()}/reset`, { method: 'POST' }).catch(() => {});
  manager?.resetLog();
}
