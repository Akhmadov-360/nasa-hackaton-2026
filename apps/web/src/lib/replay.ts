import { TIME_TRAVEL_SPAN_SEC } from './constants';
import { useMissionStore } from './store/missionStore';

/** Within this many seconds of the present a replay counts as caught up and hands over to live. */
const LIVE_EPS = 0.3;
/** Step of the skip buttons. */
export const SKIP_SEC = 10;
export const REPLAY_SPEEDS = [1, 2, 4, 8];

/**
 * Earliest replayable moment: the start of this session (there is nothing recorded before it, and a 24 h bar would make
 * a few minutes of events a one-pixel sliver), at least 2 minutes back, at most 24 h, never before mission time 0.
 */
export const replayFloor = (now: number, startT = useMissionStore.getState().startT) =>
  Math.max(0, now - TIME_TRAVEL_SPAN_SEC, startT > 0 ? Math.min(startT, now - 120) : 0);

/**
 * Replay controls. They only change which moment the display shows: the live pipeline (frames, alerts,
 * forecasts, the island, the flight log) is never touched, so monitoring continues while an operator reviews the past.
 */
export const replay = {
  /** one tick of the playback clock: advance by `dtSec` of wall time at the chosen speed */
  advance(dtSec: number): void {
    const s = useMissionStore.getState();
    if (s.timeTravelT === null || !s.replayPlaying) return;
    const next = s.timeTravelT + dtSec * s.replaySpeed;
    if (next >= s.t - LIVE_EPS) s.setTimeTravel(null); // caught up with the present
    else s.setTimeTravel(next);
  },

  /** jump to a moment (a scrub or a click on the bar); `play` starts the replay from there */
  seek(t: number, play: boolean): void {
    const s = useMissionStore.getState();
    if (t >= s.t - LIVE_EPS) { s.setTimeTravel(null); return; }
    s.enterReplay(Math.max(replayFloor(s.t), t), play);
  },

  /** skip by `deltaSec` (negative = back). From live, a skip back starts a replay of that stretch. */
  skip(deltaSec: number): void {
    const s = useMissionStore.getState();
    if (s.timeTravelT === null) {
      if (deltaSec < 0) s.enterReplay(Math.max(replayFloor(s.t), s.t + deltaSec), true);
      return;
    }
    replay.seek(s.timeTravelT + deltaSec, s.replayPlaying);
  },

  /** pause or resume; from live it freezes the display at this moment while live monitoring goes on */
  toggle(): void {
    const s = useMissionStore.getState();
    if (s.timeTravelT === null) s.enterReplay(s.t, false);
    else s.setReplayPlaying(!s.replayPlaying);
  },

  live(): void {
    useMissionStore.getState().setTimeTravel(null);
  },
};
