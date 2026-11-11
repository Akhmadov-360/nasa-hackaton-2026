'use client';
import { Activity, Brain, Cloud, Droplet, Droplets, Fan, Gauge, HeartPulse, Thermometer, Volume2, Waves, Wind, Zap } from 'lucide-react';
import { worstStatus } from '@astro/engine';
import { useDisplayFrame } from '@/hooks/useDisplayFrame';
import { useT } from '@/lib/i18n';
import { ORGANS } from '@/lib/metrics';
import { useMissionStore } from '@/lib/store/missionStore';
import { Separator } from '@/components/ui/separator';
import { WidgetBoundary } from '@/components/WidgetBoundary';
import { EcgChart } from './EcgChart';
import { RadiationCard } from './RadiationCard';
import { VitalCard } from './VitalCard';

const ic = 'size-4 shrink-0';

export function TelemetryGrid({ crewId }: { crewId: string }) {
  const t = useT();
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

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-3">
      <WidgetBoundary name="ECG"><EcgChart crewId={crewId} /></WidgetBoundary>
      {/* one flat plateau: hairline dividers between readings, no cards inside the card */}
      <div className="relative grid flex-1 auto-rows-fr grid-cols-2 gap-px overflow-hidden rounded-[20px] bg-white/10 md:grid-cols-4 md:gap-0 md:bg-transparent">
        {/* continuous rules that cross cleanly: the radiation cell spans the whole last row, so that row has no inner verticals */}
        <div className="pointer-events-none absolute inset-0 z-10 hidden md:block" aria-hidden>
          <Separator orientation="vertical" className="absolute top-0 left-1/4" />
          <Separator orientation="vertical" className="absolute top-0 left-1/2 data-[orientation=vertical]:h-3/4" />
          <Separator orientation="vertical" className="absolute top-0 left-3/4 data-[orientation=vertical]:h-3/4" />
          <Separator className="absolute top-1/4 left-0" />
          <Separator className="absolute top-1/2 left-0" />
          <Separator className="absolute top-3/4 left-0" />
        </div>
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
        {card('o2', t('metric.o2'), <Waves className={ic} aria-hidden />, '%', frame?.cabin.o2, (f) => f.cabin.o2, { decimals: 1 })}
        {card('co2', t('metric.co2'), <Cloud className={ic} aria-hidden />, 'mmHg', frame?.cabin.co2, (f) => f.cabin.co2, { decimals: 1 })}
        {card('humidity', t('metric.humidity'), <Droplet className={ic} aria-hidden />, '%', frame?.cabin.humidity, (f) => f.cabin.humidity)}
        {card('noise', t('metric.noise'), <Volume2 className={ic} aria-hidden />, 'NC', frame?.cabin.noise, (f) => f.cabin.noise)}
        {card('airflow', t('metric.airflow'), <Fan className={ic} aria-hidden />, 'm/s', frame?.cabin.airflow, (f) => f.cabin.airflow, { decimals: 2 })}
        <div className="col-span-2 md:col-span-3">
          <WidgetBoundary name="Radiation"><RadiationCard frame={frame} crewId={crewId} tick={tick} /></WidgetBoundary>
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-teal" aria-hidden /> {t('badge.real')}</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full border border-amber" aria-hidden /> {t('badge.modeled')}</span>
      </p>
    </div>
  );
}
