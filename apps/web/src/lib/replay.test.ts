import { beforeEach, describe, expect, it } from 'vitest';
import { replay } from './replay';
import { useMissionStore } from './store/missionStore';

const st = () => useMissionStore.getState();

describe('replay', () => {
  beforeEach(() => {
    useMissionStore.setState({ t: 1000, timeTravelT: null, replayPlaying: false, replaySpeed: 4 });
  });

  it('plays from a moment towards the present at the chosen speed and hands over to live when caught up', () => {
    replay.seek(900, true);
    expect(st().timeTravelT).toBe(900);
    replay.advance(10); // 10 s at 4x = 40 s
    expect(st().timeTravelT).toBeCloseTo(940, 5);
    replay.advance(100); // would pass the present
    expect(st().timeTravelT).toBeNull();
    expect(st().replayPlaying).toBe(false);
  });

  it('does not move while paused, and resumes', () => {
    replay.seek(900, true);
    replay.toggle();
    replay.advance(10);
    expect(st().timeTravelT).toBe(900);
    replay.toggle();
    replay.advance(1);
    expect(st().timeTravelT).toBeCloseTo(904, 5);
  });

  it('skips 10 s either way, clamps at the start and goes live past the present', () => {
    replay.skip(-10); // from live: replay the last 10 s
    expect(st().timeTravelT).toBe(990);
    expect(st().replayPlaying).toBe(true);
    replay.skip(-10);
    expect(st().timeTravelT).toBe(980);
    replay.skip(+10);
    replay.skip(+10);
    expect(st().timeTravelT).toBeNull();
    useMissionStore.setState({ t: 5 });
    replay.skip(-10);
    expect(st().timeTravelT).toBe(0);
  });

  it('the replay window starts at the session start, but is never shorter than 2 minutes', () => {
    useMissionStore.setState({ t: 1000, startT: 700 });
    replay.skip(-1000);
    expect(st().timeTravelT).toBe(700);
    useMissionStore.setState({ t: 1000, startT: 990, timeTravelT: null });
    replay.skip(-1000);
    expect(st().timeTravelT).toBe(880); // 120 s back
    useMissionStore.setState({ startT: 0 });
  });

  it('pausing from live freezes the display at the present without touching the live clock', () => {
    replay.toggle();
    expect(st().timeTravelT).toBe(1000);
    expect(st().replayPlaying).toBe(false);
    expect(st().t).toBe(1000);
  });
});
