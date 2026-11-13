import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { Alert, EngineEvent, Status, TelemetryFrame, TelemetryPackage } from '@astro/engine';
import type { SourceMode } from '../sources/types';
import type { DictKey, Params } from '../i18n';
import { crew } from '../engineConfig';
import { STATUS_RANK, viewOfMetric, type TelemetryView } from '../metrics';

export type Locale = 'en' | 'ru' | 'uz';

export interface LogEntry {
  id: string;
  /** mission elapsed time, seconds */
  t: number;
  kind: 'alert' | 'command' | 'link' | 'system';
  severity?: Status;
  /** text is built from a dictionary key at display time, so a language switch re-translates old entries */
  key: DictKey;
  params?: Params;
  /** alert entries: lets repeated alerts for one metric collapse into one row */
  crewId?: string;
  metric?: string;
  value?: number;
  unit?: string;
  trail?: Status[];
}

export interface ProtocolView {
  /** key into protocols.json */
  protocolId: string;
  /** stable key for the checklist state: an incident id or a log entry id */
  key: string;
  crewId?: string;
  t?: number;
}

export interface ImportedPackage {
  pkg: TelemetryPackage;
  name: string;
  bytes: number;
}

export interface MissionState {
  entered: boolean;
  selectedCrewId: string;
  focusedOrgan: string | null;
  mode: SourceMode;
  everLive: boolean;
  t: number;
  /** wall-clock ms of the last received frame batch (for the "link age" readout) */
  lastFrameAt: number;
  latest: Record<string, TelemetryFrame>;
  degraded: Record<string, boolean>;
  audit: LogEntry[];
  events: EngineEvent[];
  /** newest warning/critical alert, drives the island pill */
  island: Alert | null;
  /** MET to inspect, or null for live */
  timeTravelT: number | null;
  locale: Locale;
  /** mission time of the first frame of this session (start of the whole-session report) */
  startT: number;
  /** id of the server run, from the hello message */
  sessionId: string;
  reportOpen: boolean;
  imported: ImportedPackage | null;
  protocolView: ProtocolView | null;
  /** ticked checklist steps, keyed by "<view key>:<step index>" */
  checks: Record<string, boolean>;
  setSessionId: (id: string) => void;
  setReportOpen: (open: boolean) => void;
  setImported: (p: ImportedPackage | null) => void;
  openProtocol: (v: ProtocolView) => void;
  closeProtocol: () => void;
  toggleCheck: (key: string) => void;
  clearChecks: (prefix: string) => void;

  enter: () => void;
  selectCrew: (id: string) => void;
  /** which telemetry tab is open (not persisted) */
  telemetryView: TelemetryView;
  setTelemetryView: (v: TelemetryView) => void;
  /** select a crew member and open the tab that holds a reading: used by every "go to the problem" click */
  jumpTo: (crewId: string | undefined, metric: string | undefined) => void;
  /** counts operator commands; the status island reacts to each one */
  pulse: number;
  pulseIsland: () => void;
  focusOrgan: (id: string | null) => void;
  setMode: (mode: SourceMode, everLive: boolean) => void;
  applyFrames: (t: number, frames: TelemetryFrame[], degraded: Record<string, boolean>) => void;
  addAudit: (e: Omit<LogEntry, 'id'>) => void;
  soundOn: boolean;
  setSound: (on: boolean) => void;
  clearEvents: () => void;
  setIsland: (a: Alert | null) => void;
  addEvent: (e: EngineEvent) => void;
  setEvents: (log: EngineEvent[]) => void;
  setTimeTravel: (t: number | null) => void;
  setLocale: (l: Locale) => void;
}

/** localStorage that never throws (private mode, quota, corrupt data) and falls back to memory. */
const memory = new Map<string, string>();
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return memory.get(k) ?? null;
    }
  },
  setItem: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      memory.set(k, v);
    }
  },
  removeItem: (k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      memory.delete(k);
    }
  },
};

let seq = 0;
const cap = <T,>(a: T[], n: number) => (a.length > n ? a.slice(a.length - n) : a);

export const useMissionStore = create<MissionState>()(
  persist(
    (set) => ({
      entered: false,
      selectedCrewId: 'A1',
      focusedOrgan: null,
      mode: 'STALE',
      everLive: false,
      t: 0,
      lastFrameAt: 0,
      latest: {},
      degraded: {},
      audit: [],
      events: [],
      island: null,
      timeTravelT: null,
      locale: 'en',
      startT: 0,
      sessionId: 'local',
      reportOpen: false,
      imported: null,
      protocolView: null,
      checks: {},
      setSessionId: (id) => set({ sessionId: id }),
      setReportOpen: (open) => set({ reportOpen: open }),
      setImported: (p) => set({ imported: p }),
      openProtocol: (v) => set({ protocolView: v }),
      closeProtocol: () => set({ protocolView: null }),
      toggleCheck: (key) => set((s) => ({ checks: { ...s.checks, [key]: !s.checks[key] } })),
      clearChecks: (prefix) => set((s) => ({ checks: Object.fromEntries(Object.entries(s.checks).filter(([k]) => !k.startsWith(prefix))) })),
      soundOn: true,
      setSound: (on) => set({ soundOn: on }),
      clearEvents: () => set({ events: [] }),

      enter: () => set({ entered: true }),
      selectCrew: (id) => set({ selectedCrewId: id, focusedOrgan: null }),
      telemetryView: 'vitals',
      setTelemetryView: (v) => set({ telemetryView: v }),
      jumpTo: (crewId, metric) =>
        set((s) => ({
          selectedCrewId: crewId && crew.some((c) => c.id === crewId) ? crewId : s.selectedCrewId,
          focusedOrgan: null,
          telemetryView: viewOfMetric(metric),
        })),
      pulse: 0,
      pulseIsland: () => set((s) => ({ pulse: s.pulse + 1 })),
      focusOrgan: (id) => set({ focusedOrgan: id }),
      setMode: (mode, everLive) => set({ mode, everLive }),
      applyFrames: (t, frames, degraded) =>
        set((s) => {
          const latest = { ...s.latest };
          for (const f of frames) latest[f.crewId] = f;
          return { t, startT: s.startT || t, latest, degraded: { ...s.degraded, ...degraded }, lastFrameAt: Date.now() };
        }),
      addAudit: (e) =>
        set((s) => {
          // collapse an escalating alert (same crew member and metric, within 90 s) into one row
          if (e.kind === 'alert') {
            for (let i = s.audit.length - 1; i >= Math.max(0, s.audit.length - 12); i--) {
              const prev = s.audit[i];
              if (prev.kind === 'alert' && prev.crewId === e.crewId && prev.metric === e.metric && e.t - prev.t < 90) {
                const trail = [...(prev.trail ?? [prev.severity as Status]), e.severity as Status].slice(-3);
                const merged: LogEntry = { ...prev, severity: e.severity, value: e.value, unit: e.unit, trail };
                return { audit: [...s.audit.slice(0, i), ...s.audit.slice(i + 1), merged] };
              }
            }
          }
          return { audit: cap([...s.audit, { ...e, id: `${Date.now()}-${seq++}` }], 200) };
        }),
      setIsland: (a) => set({ island: a }),
      addEvent: (e) => set((s) => ({ events: cap([...s.events, e], 500) })),
      setEvents: (log) => set({ events: cap(log, 500) }),
      setTimeTravel: (t) => set({ timeTravelT: t }),
      setLocale: (l) => set({ locale: l }),
    }),
    {
      name: 'astro-monitor',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      // only preferences survive a reload; events and the flight log belong to one server run
      partialize: (s) => ({ locale: s.locale, selectedCrewId: s.selectedCrewId }),
      // corrupt or foreign persisted data must never break startup
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<MissionState>;
        return {
          ...current,
          locale: p.locale === 'ru' || p.locale === 'uz' ? p.locale : 'en',
          selectedCrewId: crew.some((c) => c.id === p.selectedCrewId) ? (p.selectedCrewId as string) : current.selectedCrewId,
        };
      },
    },
  ),
);

export function globalStatus(latest: Record<string, TelemetryFrame>): Status {
  let worst: Status = 'NOMINAL';
  for (const f of Object.values(latest)) {
    if (STATUS_RANK[f.status.overall] > STATUS_RANK[worst]) worst = f.status.overall;
  }
  return worst;
}
