'use client';
import { useState } from 'react';
import { Activity, Brain, Cloud, Droplet, Droplets, Fan, Gauge, HeartPulse, Radiation, Thermometer, Volume2, Waves, Wind, Zap } from 'lucide-react';
import { worstStatus } from '@astro/engine';
import { useDisplayFrame } from '@/hooks/useDisplayFrame';
import { statusWord, useT, type DictKey } from '@/lib/i18n';
import { ORGANS, STATUS_COLOR } from '@/lib/metrics';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMissionStore } from '@/lib/store/missionStore';
import { Separator } from '@/components/ui/separator';
import { WidgetBoundary } from '@/components/WidgetBoundary';
import { EcgChart } from './EcgChart';
import { RadiationCard } from './RadiationCard';
import { VitalCard } from './VitalCard';

const ic = 'size-4 shrink-0';
type View = 'vitals' | 'cabin' | 'radiation';

export function TelemetryGrid({ crewId }: { crewId: string }) {
  const t = useT();
  const locale = useMissionStore((s) => s.locale);
  const [view, setView] = useState<View>('vitals');
  const { frame, replay } = useDisplayFrame(crewId);
  const focused = useMissionStore((s) => s.focusedOrgan);
  const degraded = useMissionStore((s) => s.degraded[crewId]);
  const tick = useMissionStore((s) => s.t);
  const hl = (...keys: string[]) => {
    const organ = ORGANS.find((o) => o.id === focused);
    return !!organ && keys.some((k) => (organ.metrics as string[]).includes(k));
  };
  const s = (k: string) => frame?.status.byMetric[k] ?? 'NOMINAL';
  const v = frame?.vitals;

  const card = (
    key: string, label: string, icon: React.ReactNode, unit: string, value: number | undefined,
    read: (f: NonNullable<typeof frame>) => number, opts: { decimals?: number } = {},
  ) => (
    <WidgetBoundary name={label} key={key}>
      <VitalCard
        crewId={crewId} sourceKey={key} metricKey={key} live={!replay}
        label={label} icon={icon} unit={unit} value={value} decimals={opts.decimals}
        status={s(key)} read={read} tick={tick} highlighted={hl(key)} degraded={degraded}
      />
    </WidgetBoundary>
  );

  /** one flat plateau: hairline dividers between cells, no cards inside the card */
  const plateau = (cols: number, rows: number, children: React.ReactNode) => (
    <div
      className={`relative grid flex-1 auto-rows-fr grid-cols-2 gap-px overflow-hidden rounded-[20px] bg-white/10 md:gap-0 md:bg-transparent ${cols === 4 ? 'md:grid-cols-4' : cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}
    >
      <div className="pointer-events-none absolute inset-0 z-10 hidden md:block" aria-hidden>
        {Array.from({ length: cols - 1 }, (_, i) => <Separator key={`v${i}`} orientation="vertical" className="absolute top-0" style={{ left: `${((i + 1) / cols) * 100}%` }} />)}
        {Array.from({ length: rows - 1 }, (_, i) => <Separator key={`h${i}`} className="absolute left-0" style={{ top: `${((i + 1) / rows) * 100}%` }} />)}
      </div>
      {children}
    </div>
  );

  const VIEW_METRICS: Record<View, string[]> = {
    vitals: ['hr', 'hrv', 'spo2', 'bpSys', 'bpDia', 'respRate', 'temp', 'stress', 'eeg'],
    cabin: ['o2', 'co2', 'humidity', 'noise', 'airflow'],
    radiation: ['doseRate', 'dose'],
  };
  const viewStatus = (k: View) => worstStatus(VIEW_METRICS[k].map(s));
  const VIEW_ICON = { vitals: HeartPulse, cabin: Waves, radiation: Radiation } as const;

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-3">
      <WidgetBoundary name="ECG"><EcgChart crewId={crewId} /></WidgetBoundary>
      {/* three views instead of one crowded wall; a dot on a tab keeps an alarm visible while another view is open */}
      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <TabsList aria-label={t('view.label')}>
          {(['vitals', 'cabin', 'radiation'] as View[]).map((k) => {
            const st = viewStatus(k);
            const Icon = VIEW_ICON[k];
            return (
              <TabsTrigger key={k} value={k} className="gap-2">
                <Icon className="size-4" aria-hidden /> {t(`view.${k}` as DictKey)}
                {st !== 'NOMINAL' && (
                  <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[st] }} role="img" aria-label={statusWord(st, locale)} />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      {view === 'vitals' && plateau(4, 2, <>
        {card('hr', t('metric.hr'), <HeartPulse className={ic} aria-hidden />, 'bpm', v?.hr, (f) => f.vitals.hr)}
        {card('spo2', t('metric.spo2'), <Droplets className={ic} aria-hidden />, '%', v?.spo2, (f) => f.vitals.spo2)}
        <WidgetBoundary name={t('metric.bp')} key="bp">
          <VitalCard
            crewId={crewId} sourceKey="bp" metricKey="bpSys" live={!replay} label={t('metric.bp')} icon={<Gauge className={ic} aria-hidden />} unit="mmHg"
            value={v?.bpSys} value2={v?.bpDia} status={worstStatus([s('bpSys'), s('bpDia')])}
            read={(f) => f.vitals.bpSys} tick={tick} highlighted={hl('bpSys', 'bpDia')} degraded={degraded}
          />
        </WidgetBoundary>
        {card('respRate', t('metric.respRate'), <Wind className={ic} aria-hidden />, '/min', v?.respRate, (f) => f.vitals.respRate)}
        {card('stress', t('metric.stress'), <Zap className={ic} aria-hidden />, 'idx', v?.stress, (f) => f.vitals.stress)}
        {card('eeg', t('metric.eeg'), <Brain className={ic} aria-hidden />, 'µV', v?.eeg, (f) => f.vitals.eeg, { decimals: 1 })}
        {card('hrv', t('metric.hrv'), <Activity className={ic} aria-hidden />, 'ms', v?.hrv, (f) => f.vitals.hrv)}
        {card('temp', t('metric.temp'), <Thermometer className={ic} aria-hidden />, '°C', v?.temp, (f) => f.vitals.temp, { decimals: 1 })}
      </>)}
      {view === 'cabin' && plateau(3, 2, <>
        {card('o2', t('metric.o2'), <Waves className={ic} aria-hidden />, '%', frame?.cabin.o2, (f) => f.cabin.o2, { decimals: 1 })}
        {card('co2', t('metric.co2'), <Cloud className={ic} aria-hidden />, 'mmHg', frame?.cabin.co2, (f) => f.cabin.co2, { decimals: 1 })}
        {card('humidity', t('metric.humidity'), <Droplet className={ic} aria-hidden />, '%', frame?.cabin.humidity, (f) => f.cabin.humidity)}
        {card('noise', t('metric.noise'), <Volume2 className={ic} aria-hidden />, 'NC', frame?.cabin.noise, (f) => f.cabin.noise)}
        {card('airflow', t('metric.airflow'), <Fan className={ic} aria-hidden />, 'm/s', frame?.cabin.airflow, (f) => f.cabin.airflow, { decimals: 2 })}
        <p className="bg-cell p-3.5 text-xs leading-relaxed text-muted-foreground">{t('view.cabin.note')}</p>
      </>)}
      {view === 'radiation' && plateau(1, 1, (
        <WidgetBoundary name="Radiation"><RadiationCard frame={frame} crewId={crewId} tick={tick} large /></WidgetBoundary>
      ))}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-teal" aria-hidden /> {t('badge.real')}</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full border border-amber" aria-hidden /> {t('badge.modeled')}</span>
      </p>
    </div>
  );
}
