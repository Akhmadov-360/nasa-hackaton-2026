import { visitorId } from './visitor';

/** Same default as the API (3 days 12 h into the mission), so SIM and LIVE clocks line up. */
export const DEFAULT_MET_OFFSET_SEC = 3 * 86400 + 12 * 3600;

export const BUFFER_TICKS = 500;
export const LIVE_TIMEOUT_MS = 3000;
export const STALE_MS = 5000;
export const SIGNAL_LOST_BANNER = 'SIGNAL LOST — USING ESTIMATED TELEMETRY';
export const HOLD_MS = 800;
export const TIME_TRAVEL_SPAN_SEC = 24 * 3600;

export const apiBase = () =>
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof location !== 'undefined' ? `http://${location.hostname}:3001` : 'http://localhost:3001');
/** Query that selects this visitor's own simulation on the API. */
export const sessionQuery = () => `?sid=${visitorId()}`;
export const wsUrl = () => apiBase().replace(/^http/, 'ws') + '/ws' + sessionQuery();
