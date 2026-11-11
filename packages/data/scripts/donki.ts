/** A solar flare in the shape build-pack.ts reads (the same fields the DONKI FLR endpoint returns). */
export interface Flare {
  flrID: string;
  classType: string;
  beginTime: string;
  peakTime: string;
  endTime: string | null;
  sourceLocation: string | null;
  link: string;
}

export interface Notification {
  messageID: string;
  messageURL: string;
  messageBody: string;
}

const START = /Flare start time:\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z)/;
const PEAK = /Flare peak time:\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z)/;
const CLASS = /Flare intensity:\s*([A-Z]\d+(?:\.\d+)?)\s*class/i;

/**
 * Fallback for when the DONKI /FLR endpoint is down: DONKI's own flare notifications carry the same facts
 * (class, start, peak) as text. Threshold-crossing alerts and anything incomplete are skipped.
 */
export function flaresFromNotifications(messages: Notification[]): Flare[] {
  const out: Flare[] = [];
  for (const m of messages) {
    const body = typeof m?.messageBody === 'string' ? m.messageBody : '';
    const start = START.exec(body);
    const peak = PEAK.exec(body);
    const cls = CLASS.exec(body);
    if (!start || !peak || !cls) continue;
    out.push({
      flrID: m.messageID,
      classType: cls[1].toUpperCase(),
      beginTime: start[1],
      peakTime: peak[1],
      endTime: null,
      sourceLocation: null,
      link: m.messageURL,
    });
  }
  return out;
}
