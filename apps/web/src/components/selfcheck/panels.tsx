'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Droplets, Pencil } from 'lucide-react';
import { MANUAL, type ManualMetric } from '@astro/engine';
import ElasticSlider from '@/components/ElasticSlider';
import { Button } from '@/components/ui/button';
import { useT, type DictKey } from '@/lib/i18n';
import { useMissionStore } from '@/lib/store/missionStore';
import { useSelfCheck } from './context';
import { MOOD_FACES, moodFace } from './mood';
import { ageText, WATER_SUPPLY_L } from './SelfCheckView';
import { formatMetShort } from './time';

const FIELD = 'num h-10 w-full rounded-xl bg-white/6 px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-coral';

/** One entry: a titled panel with its hint. It scrolls into view when the window was opened at it, and shows the correction banner. */
function Panel({ metric, hint, focus, children }: { metric: ManualMetric; hint: string; focus: boolean; children: ReactNode }) {
  const t = useT();
  const { editing, stopEdit } = useSelfCheck();
  const ref = useRef<HTMLElement>(null);
  const mine = editing?.metric === metric ? editing : null;
  useEffect(() => { if (focus) ref.current?.scrollIntoView({ block: 'nearest' }); }, [focus]);
  const live = useMissionStore((s) => s.t);
  return (
    <section
      ref={ref} aria-labelledby={`sc-${metric}`}
      className="flex flex-col gap-2.5 rounded-2xl bg-cell p-3.5 transition-shadow duration-300"
      style={mine ? { boxShadow: 'inset 3px 0 0 var(--color-amber)' } : focus ? { boxShadow: 'inset 3px 0 0 var(--color-teal)' } : undefined}
    >
      <div>
        <h3 id={`sc-${metric}`} className="text-sm font-medium">{t(`metric.${metric}` as DictKey)} <span className="text-xs font-normal text-muted-foreground">{MANUAL[metric].unit}</span></h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {mine && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-amber/12 px-2.5 py-1.5 text-xs text-bone">
          <span className="flex items-center gap-1.5"><Pencil className="size-3.5 text-amber" aria-hidden />{t('selfcheck.editing', { time: `${formatMetShort(mine.t)} · ${ageText(live - mine.t, t)}` })}</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 rounded-full px-2.5" onClick={stopEdit}>{t('selfcheck.cancelEdit')}</Button>
        </div>
      )}
      {children}
    </section>
  );
}

/** Save or Update, depending on whether this metric is being corrected. */
function SaveButton({ metric, onClick, disabled, className = '' }: { metric: ManualMetric; onClick: () => void; disabled?: boolean; className?: string }) {
  const t = useT();
  const { editing } = useSelfCheck();
  return <Button type="button" className={className} onClick={onClick} disabled={disabled}>{editing?.metric === metric ? t('selfcheck.update') : t('selfcheck.save')}</Button>;
}

/** Text of an entry typed in a field: accepts a decimal comma. */
const num = (s: string) => Number(s.trim().replace(',', '.'));

export function GlucosePanel({ focus }: { focus: boolean }) {
  const t = useT();
  const { save, editing } = useSelfCheck();
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const mine = editing?.metric === 'glucose' ? editing : null;
  useEffect(() => { if (mine) setText(String(mine.value)); }, [mine?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = () => {
    const err = save('glucose', num(text));
    setError(err);
    if (!err) setText('');
  };
  return (
    <Panel metric="glucose" focus={focus} hint={t('selfcheck.glucose.hint')}>
      <div className="flex gap-2">
        <input
          className={FIELD} inputMode="decimal" placeholder="mg/dL" value={text} aria-label={t('metric.glucose')} aria-invalid={!!error}
          onChange={(e) => { setText(e.target.value); setError(undefined); }} onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <SaveButton metric="glucose" onClick={submit} disabled={!text.trim()} />
      </div>
      {error && <p role="alert" className="text-xs text-coral">{error}</p>}
    </Panel>
  );
}

export function SleepPanel({ focus }: { focus: boolean }) {
  const t = useT();
  const { save, editing } = useSelfCheck();
  const [hours, setHours] = useState(7);
  const mine = editing?.metric === 'sleep' ? editing : null;
  useEffect(() => { if (mine) setHours(mine.value); }, [mine?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Panel metric="sleep" focus={focus} hint={t('selfcheck.sleep.hint')}>
      <p className="num text-lg font-medium">{hours.toFixed(1)} h</p>
      <ElasticSlider
        ariaLabel={t('metric.sleep')} value={hours} startingValue={0} maxValue={12} isStepped stepSize={0.5}
        onChange={setHours} leftIcon={null} rightIcon={null} valuePosition="bubble" formatValue={(v) => `${v.toFixed(1)} h`}
        thickness={8} activeThickness={14} restOpacity={1} maxStretch={12}
        trackColor="rgba(159,176,201,0.28)" rangeColor="#4FB6A8" contentColor="#9fb0c9" className="w-full"
      />
      <SaveButton metric="sleep" className="self-end" onClick={() => save('sleep', hours)} />
    </Panel>
  );
}

/** Mood as five faces: a radio group (arrow keys work), the chosen face grows and takes its colour, the word and a short line say what it means. */
export function MoodPanel({ focus }: { focus: boolean }) {
  const t = useT();
  const { save, editing } = useSelfCheck();
  const [mood, setMood] = useState(3);
  const mine = editing?.metric === 'mood' ? editing : null;
  useEffect(() => { if (mine) setMood(mine.value); }, [mine?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = moodFace(mood);
  return (
    <Panel metric="mood" focus={focus} hint={t('selfcheck.mood.hint')}>
      <fieldset className="flex justify-between gap-1.5">
        <legend className="sr-only">{t('metric.mood')}</legend>
        {MOOD_FACES.map(({ value, Icon, color }) => {
          const on = value === mood;
          return (
            <label key={value} className="group/m relative flex-1 cursor-pointer">
              <input type="radio" name="mood" value={value} checked={on} onChange={() => setMood(value)} className="peer sr-only" aria-label={`${value} / 5, ${t(`selfcheck.mood.${value}` as DictKey)}`} />
              <span
                className="grid h-14 place-items-center rounded-2xl transition-[transform,background-color,box-shadow] duration-200 ease-out group-hover/m:bg-white/8 peer-focus-visible:ring-2 peer-focus-visible:ring-ring motion-reduce:transition-none"
                style={on ? { background: `color-mix(in srgb, ${color} 18%, transparent)`, boxShadow: `inset 0 0 0 1.5px ${color}`, transform: 'scale(1.06)' } : { background: 'rgba(255,255,255,0.04)' }}
              >
                <Icon className="size-7 transition-colors duration-200" style={{ color: on ? color : 'var(--color-muted-foreground)' }} aria-hidden />
              </span>
            </label>
          );
        })}
      </fieldset>
      <div className="min-h-[2.75rem]" aria-live="polite">
        <p className="text-base font-medium" style={{ color: chosen.color }}>{t(`selfcheck.mood.${mood}` as DictKey)}</p>
        <p className="text-xs text-muted-foreground">{t(`selfcheck.moodDesc.${mood}` as DictKey)}</p>
      </div>
      <SaveButton metric="mood" className="self-end" onClick={() => save('mood', mood)} />
    </Panel>
  );
}

const WATER_QUICK = [0.25, 0.33, 0.5, 0.75];

export function WaterPanel({ focus }: { focus: boolean }) {
  const t = useT();
  const { save, editing, crewId } = useSelfCheck();
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const total = useMissionStore((s) => s.latest[crewId]?.manual?.hydration?.value ?? 0);
  const mine = editing?.metric === 'hydration' ? editing : null;
  useEffect(() => { if (mine) setText(String(mine.value)); }, [mine?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = () => {
    const err = save('hydration', num(text));
    setError(err);
    if (!err) setText('');
  };
  return (
    <Panel metric="hydration" focus={focus} hint={t('selfcheck.water.hint')}>
      <div>
        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span>{t('selfcheck.total')}</span>
          <span className="num text-sm text-bone">{total.toFixed(2)} / {WATER_SUPPLY_L} L</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-white/8" role="meter" aria-valuemin={0} aria-valuemax={WATER_SUPPLY_L} aria-valuenow={Math.min(total, WATER_SUPPLY_L)} aria-label={t('selfcheck.total')}>
          <div className="h-full rounded-full bg-teal transition-[width] duration-500" style={{ width: `${Math.min(100, (total / WATER_SUPPLY_L) * 100)}%` }} />
        </div>
      </div>
      {!mine && (
        <div className="flex flex-wrap gap-2">
          {WATER_QUICK.map((l) => (
            <Button key={l} type="button" variant="secondary" onClick={() => save('hydration', l)}><Droplets aria-hidden /> +{l} L</Button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className={FIELD} inputMode="decimal" placeholder={t('selfcheck.other')} value={text} aria-label={t('selfcheck.other')} aria-invalid={!!error}
          onChange={(e) => { setText(e.target.value); setError(undefined); }} onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <Button type="button" onClick={submit} disabled={!text.trim()}>{mine ? t('selfcheck.update') : t('selfcheck.add')}</Button>
      </div>
      {error && <p role="alert" className="text-xs text-coral">{error}</p>}
      <p className="text-[11px] leading-snug text-muted-foreground">{t('selfcheck.waterRef', { l: WATER_SUPPLY_L })}</p>
    </Panel>
  );
}
