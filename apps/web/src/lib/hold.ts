import { HOLD_MS } from './constants';

/**
 * Hold-to-confirm timing, independent of React.
 * Fires onConfirm exactly once per press; a new press is only accepted after cancel() (release).
 */
export class HoldController {
  private timer?: ReturnType<typeof setInterval>;
  private startedAt = 0;
  private fired = false;
  private holding = false;

  constructor(
    private readonly onConfirm: () => void,
    private readonly onProgress: (p: number) => void,
    private readonly ms = HOLD_MS,
  ) {}

  start(): void {
    if (this.holding) return; // ignore key-repeat and double-press until released
    this.holding = true;
    this.fired = false;
    this.startedAt = Date.now();
    this.timer = setInterval(() => this.step(), 16);
  }

  cancel(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.holding = false;
    this.onProgress(0);
  }

  private step(): void {
    const p = Math.min(1, (Date.now() - this.startedAt) / this.ms);
    this.onProgress(p);
    if (p >= 1 && !this.fired) {
      this.fired = true;
      clearInterval(this.timer);
      this.timer = undefined;
      this.onConfirm();
    }
  }
}
