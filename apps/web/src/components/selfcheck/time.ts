import { formatMet } from '@/lib/metrics';

/** MET without the leading zeros of the day: "003:12:00:32" becomes "3d 12:00". */
export function formatMetShort(t: number): string {
  const [d, h, m] = formatMet(t).split(':');
  return `${Number(d)}d ${h}:${m}`;
}

/** A wall-clock time for the report: "2026-11-14 12:03:09" in the viewer's time zone. */
export function formatClock(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
