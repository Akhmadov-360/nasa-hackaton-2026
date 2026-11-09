'use client';
import { History, Radio } from 'lucide-react';
import { TIME_TRAVEL_SPAN_SEC } from '@/lib/constants';
import { useT } from '@/lib/i18n';
import { formatMet } from '@/lib/metrics';
import { useMissionStore } from '@/lib/store/missionStore';

const EVENT_COLOR = { flare: '#D9645A', exertion: '#D9A441', o2fault: '#D9645A', normalize: '#4FB6A8' };

/** Scrubber over the last 24 h of mission time. Dragging back reconstructs the past from the event log. */
export function TimeTravelBar() {
  const t = useT();
  const now = useMissionStore((s) => s.t);
  const tt = useMissionStore((s) => s.timeTravelT);
  const events = useMissionStore((s) => s.events);
  const set = useMissionStore((s) => s.setTimeTravel);
  const minT = Math.max(0, now - TIME_TRAVEL_SPAN_SEC);
  const span = Math.max(1, now - minT);
  const offset = tt === null ? 0 : tt - now; // 0 .. -span
  const replay = tt !== null;

  const onChange = (v: number) => {
    // v is seconds back from now (0 = live); snap to live near the right edge
    if (v >= -5) set(null);
    else set(Math.min(now, Math.max(minT, now + v)));
  };

  return (
    <section className="glass glass-blur flex items-center gap-4 px-4 py-3" aria-label={t('tt.title')}>
      <div className="flex shrink-0 items-center gap-2 text-sm text-mist">
        <History className="size-4" aria-hidden /> <span className="hidden sm:inline">{t('tt.title')}</span>
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-x-0 -top-1 h-2" aria-hidden>
          {events.filter((e) => e.t >= minT && e.t <= now).map((e, i) => (
            <span key={`${e.t}-${i}`} className="absolute top-0 h-2 w-0.5 rounded-full" title={e.type}
              style={{ left: `${((e.t - minT) / span) * 100}%`, background: EVENT_COLOR[e.type] }} />
          ))}
        </div>
        <input
          type="range" min={-span} max={0} step={60} value={replay ? offset : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={t('tt.title')} aria-valuetext={replay ? `${formatMet(tt!)}` : t('tt.live')}
          className="h-6 w-full cursor-pointer accent-teal"
        />
      </div>
      <p className="num w-36 shrink-0 text-right text-xs text-mist">
        {replay ? <span className="text-amber">{t('tt.replay')} {formatMet(tt!)}</span> : <span className="text-teal">{t('tt.live')}</span>}
      </p>
      <button
        onClick={() => set(null)} disabled={!replay}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal/15 px-3 py-1.5 text-sm text-teal enabled:hover:bg-teal/25 disabled:opacity-40"
      >
        <Radio className="size-3.5" aria-hidden /> {t('tt.back')}
      </button>
    </section>
  );
}
