'use client';
import { useEffect } from 'react';
import { FastForward, History, Pause, Play, Radio, Rewind } from 'lucide-react';
import ElasticSlider from '@/components/ElasticSlider';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Select } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useT } from '@/lib/i18n';
import { formatMet } from '@/lib/metrics';
import { REPLAY_SPEEDS, replay, replayFloor, SKIP_SEC } from '@/lib/replay';
import { globalStatus, useMissionStore } from '@/lib/store/missionStore';

const EVENT_COLOR = { flare: '#D9645A', exertion: '#D9A441', o2fault: '#D9645A', normalize: '#4FB6A8', measurement: '#9fb0c9' };

function Hint({ label, keys, children }: { label: string; keys?: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label} {keys && <Kbd>{keys}</Kbd>}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Time Travel over the last 24 h of mission time. Drag to a moment and the replay runs from there towards the present
 * (at the chosen speed, so it catches up and hands over to live). Pause, skip 10 s either way, or go live at any time.
 * Only the display moves: live monitoring (alerts, forecasts, island, flight log) keeps running underneath, and a
 * chip here shows the live status so an alarm is never missed during a replay.
 */
export function TimeTravelBar() {
  const t = useT();
  const now = useMissionStore((s) => s.t);
  const tt = useMissionStore((s) => s.timeTravelT);
  const playing = useMissionStore((s) => s.replayPlaying);
  const speed = useMissionStore((s) => s.replaySpeed);
  const setSpeed = useMissionStore((s) => s.setReplaySpeed);
  const events = useMissionStore((s) => s.events);
  const latest = useMissionStore((s) => s.latest);
  const liveStatus = globalStatus(latest);
  const inReplay = tt !== null;

  // the playback clock: real elapsed time x speed, so a background tab does not drift
  useEffect(() => {
    if (!inReplay || !playing) return undefined;
    let last = performance.now();
    const id = setInterval(() => {
      const n = performance.now();
      replay.advance((n - last) / 1000);
      last = n;
    }, 100);
    return () => clearInterval(id);
  }, [inReplay, playing]);

  const startT = useMissionStore((s) => s.startT);
  const minT = replayFloor(now, startT);
  const span = Math.max(120, now - minT);
  const value = Math.min(span, Math.max(0, (tt ?? now) - minT));

  return (
    <section className="hairline-t flex flex-wrap items-center gap-x-3 gap-y-2 bg-bar px-4 py-2.5" aria-label={t('tt.title')}>
      <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
        <History className="size-4" aria-hidden /> <span className="hidden sm:inline">{t('tt.title')}</span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Hint label={t('tt.back10')} keys="J">
          <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={() => replay.skip(-SKIP_SEC)} aria-label={t('tt.back10')}><Rewind /> {SKIP_SEC}</Button>
        </Hint>
        <Hint label={inReplay && playing ? t('tt.pause') : t('tt.play')} keys="K">
          <Button variant="secondary" size="icon" className="size-9" onClick={() => replay.toggle()} aria-label={inReplay && playing ? t('tt.pause') : t('tt.play')}>
            {inReplay && playing ? <Pause /> : <Play />}
          </Button>
        </Hint>
        <Hint label={t('tt.fwd10')} keys="L">
          <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={() => replay.skip(SKIP_SEC)} disabled={!inReplay} aria-label={t('tt.fwd10')}>{SKIP_SEC} <FastForward /></Button>
        </Hint>
      </div>

      <div className="relative min-w-40 flex-1 pr-3" title={t('tt.scrub')}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2" aria-hidden>
          {events.filter((e) => e.t >= minT && e.t <= now).map((e, i) => (
            <span key={`${e.t}-${i}`} className="absolute top-0 h-2 w-0.5 rounded-full" title={e.type}
              style={{ left: `${((e.t - minT) / span) * 100}%`, background: EVENT_COLOR[e.type] }} />
          ))}
        </div>
        <ElasticSlider
          ariaLabel={t('tt.title')}
          value={value} startingValue={0} maxValue={span}
          onChange={(v) => replay.seek(minT + v, false)}
          onChangeEnd={(v) => replay.seek(minT + v, true)}
          leftIcon={null} rightIcon={null} valuePosition="bubble" formatValue={(v) => formatMet(minT + v)}
          thickness={8} activeThickness={14} restOpacity={1} maxStretch={12}
          trackColor="rgba(159,176,201,0.28)" rangeColor={inReplay ? '#D9A441' : '#4FB6A8'} contentColor="#9fb0c9"
          className="w-full"
        />
      </div>

      <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <span className="hidden lg:inline">{t('tt.speed')}</span>
        <Select
          size="sm" ariaLabel={t('tt.speed')} value={String(speed)} placement="top" align="right" menuWidth={90}
          onChange={(v) => setSpeed(Number(v))}
          options={REPLAY_SPEEDS.map((x) => ({ value: String(x), label: `${x}×` }))}
        />
      </div>

      {inReplay ? (
        <div className="flex shrink-0 items-center gap-2">
          <p className="num text-xs text-amber">{t('tt.replay')} {formatMet(tt)}{playing ? '' : ' · ❚❚'}</p>
          {liveStatus !== 'NOMINAL' && (
            <button type="button" onClick={() => replay.live()} className="flex cursor-pointer items-center gap-1.5 rounded-full text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground" aria-label={t('tt.back')}>
              {t('tt.liveNow')} <StatusBadge status={liveStatus} />
            </button>
          )}
          <Hint label={t('tt.back')} keys="T">
            <Button size="sm" onClick={() => replay.live()}><Radio /> {t('tt.back')}</Button>
          </Hint>
        </div>
      ) : (
        <p className="flex w-24 shrink-0 items-center justify-end gap-1.5 text-xs text-teal"><Radio className="size-3.5" aria-hidden />{t('tt.live')}</p>
      )}
    </section>
  );
}

