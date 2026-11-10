'use client';
import { History, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  const span = Math.max(120, now - minT);
  const offset = tt === null ? 0 : Math.max(-span, tt - now); // 0 .. -span
  const replay = tt !== null;

  const onChange = (v: number) => {
    // v is seconds back from now (0 = live); snap to live near the right edge
    if (v >= -60) set(null);
    else set(Math.min(now, Math.max(minT, now + v)));
  };

  return (
    <section className="hairline-t flex items-center gap-4 bg-bar px-4 py-2.5" aria-label={t('tt.title')}>
      <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
        <History className="size-4" aria-hidden /> <span className="hidden sm:inline">{t('tt.title')}</span>
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-x-2.5 -top-0.5 h-2" aria-hidden>
          {events.filter((e) => e.t >= minT && e.t <= now).map((e, i) => (
            <span key={`${e.t}-${i}`} className="absolute top-0 h-2 w-0.5 rounded-full" title={e.type}
              style={{ left: `${((e.t - minT) / span) * 100}%`, background: EVENT_COLOR[e.type] }} />
          ))}
        </div>
        <Slider
          min={-span} max={0} step={60} value={[offset]}
          onValueChange={([v]) => onChange(v)}
          aria-label={t('tt.title')}
        />
      </div>
      {replay ? (
        <>
          <p className="num w-36 shrink-0 text-right text-xs text-amber">{t('tt.replay')} {formatMet(tt)}</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="default" onClick={() => set(null)}>
                <Radio /> {t('tt.back')}
              </Button>
            </TooltipTrigger>
            <TooltipContent><Kbd>T</Kbd></TooltipContent>
          </Tooltip>
        </>
      ) : (
        <p className="flex w-36 shrink-0 items-center justify-end gap-1.5 text-xs text-teal"><Radio className="size-3.5" aria-hidden />{t('tt.live')}</p>
      )}
    </section>
  );
}
