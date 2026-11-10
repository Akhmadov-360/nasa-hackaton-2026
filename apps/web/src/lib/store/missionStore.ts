import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { Alert, EngineEvent, Status, TelemetryFrame } from '@astro/engine';
import type { SourceMode } from '../sources/types';
import { crew } from '../engineConfig';
import { STATUS_RANK } from '../metrics';

export type Locale = 'en' | 'ru' | 'uz';

export interface LogEntry {
  id: string;
  /** mission elapsed time, seconds */
  t: number;
  kind: 'alert' | 'command' | 'link' | 'system';
  severity?: Status;
  text: string;
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

  enter: () => void;
  selectCrew: (id: string) => void;
  focusOrgan: (id: string | null) => void;
  setMode: (mode: SourceMode, everLive: boolean) => void;
  applyFrames: (t: number, frames: TelemetryFrame[], degraded: Record<string, boolean>) => void;
  addAudit: (e: Omit<LogEntry, 'id'>) => void;
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

      enter: () => set({ entered: true }),
      selectCrew: (id) => set({ selectedCrewId: id, focusedOrgan: null }),
      focusOrgan: (id) => set({ focusedOrgan: id }),
      setMode: (mode, everLive) => set({ mode, everLive }),
      applyFrames: (t, frames, degraded) =>
        set((s) => {
          const latest = { ...s.latest };
          for (const f of frames) latest[f.crewId] = f;
          return { t, latest, degraded: { ...s.degraded, ...degraded }, lastFrameAt: Date.now() };
        }),
      addAudit: (e) => set((s) => ({ audit: cap([...s.audit, { ...e, id: `${Date.now()}-${seq++}` }], 200) })),
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
