/** Fixed-capacity ring buffer: keeps only the last `cap` items. */
export class RingBuffer<T> {
  private items: T[] = [];
  constructor(private readonly cap: number) {}
  push(x: T): void {
    this.items.push(x);
    if (this.items.length > this.cap) this.items.splice(0, this.items.length - this.cap);
  }
  toArray(): T[] {
    return this.items;
  }
  last(): T | undefined {
    return this.items[this.items.length - 1];
  }
  get length(): number {
    return this.items.length;
  }
}

/** Continuous sample ring for the ECG canvas. Written at 10 Hz, read by requestAnimationFrame. */
export class SampleRing {
  readonly data: Float32Array;
  head = 0; // next write index
  filled = 0;
  constructor(readonly size: number) {
    this.data = new Float32Array(size);
  }
  push(samples: number[]): void {
    for (const s of samples) {
      this.data[this.head] = Number.isFinite(s) ? s : 0;
      this.head = (this.head + 1) % this.size;
    }
    this.filled = Math.min(this.size, this.filled + samples.length);
  }
  clear(): void {
    this.head = 0;
    this.filled = 0;
    this.data.fill(0);
  }
  /** Oldest to newest. */
  read(): Float32Array {
    const out = new Float32Array(this.filled);
    const start = (this.head - this.filled + this.size) % this.size;
    for (let i = 0; i < this.filled; i++) out[i] = this.data[(start + i) % this.size];
    return out;
  }
}
