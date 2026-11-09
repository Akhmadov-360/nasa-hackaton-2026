import type { TelemetryFrame } from '@astro/engine';
import { BUFFER_TICKS } from './constants';
import { RingBuffer, SampleRing } from './buffers';
import { crew } from './engineConfig';

/**
 * High-frequency data lives here, outside React state:
 * frame history (sparklines) and the raw ECG ring that the canvas reads every animation frame.
 */
export const frameBuffers: Record<string, RingBuffer<TelemetryFrame>> = {};
export const ecgRings: Record<string, SampleRing> = {};
const ECG_SECONDS = 6;

for (const c of crew) {
  frameBuffers[c.id] = new RingBuffer(BUFFER_TICKS);
  ecgRings[c.id] = new SampleRing(360 * ECG_SECONDS);
}

export function pushFrame(f: TelemetryFrame): void {
  frameBuffers[f.crewId]?.push(f);
  ecgRings[f.crewId]?.push(f.ecg);
}

export function resetBus(): void {
  for (const c of crew) {
    ecgRings[c.id].clear();
  }
}
