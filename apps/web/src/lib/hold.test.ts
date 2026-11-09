import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HoldController } from './hold';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function make() {
  const onConfirm = vi.fn();
  const progress: number[] = [];
  const h = new HoldController(onConfirm, (p) => progress.push(p), 800);
  return { h, onConfirm, progress };
}

describe('HoldController', () => {
  it('does not confirm before 800 ms, confirms exactly once after', () => {
    const { h, onConfirm } = make();
    h.start();
    vi.advanceTimersByTime(780);
    expect(onConfirm).not.toHaveBeenCalled();
    vi.advanceTimersByTime(40);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000); // still holding
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('resets progress and never confirms when released early or cancelled', () => {
    const { h, onConfirm, progress } = make();
    h.start();
    vi.advanceTimersByTime(400);
    h.cancel(); // pointerup / pointercancel
    vi.advanceTimersByTime(2000);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(progress.at(-1)).toBe(0);
  });

  it('needs a release before the next confirm (no double fire)', () => {
    const { h, onConfirm } = make();
    h.start(); vi.advanceTimersByTime(900);
    h.start(); vi.advanceTimersByTime(900); // second start without release is ignored
    expect(onConfirm).toHaveBeenCalledTimes(1);
    h.cancel();
    h.start(); vi.advanceTimersByTime(900);
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });
});
