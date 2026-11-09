'use client';
import { Activity, Brain, Droplets, Gauge, HeartPulse, Thermometer, Waves, Wind, Zap } from 'lucide-react';
import { worstStatus } from '@astro/engine';
import { useDisplayFrame } from '@/hooks/useDisplayFrame';
import { useT } from '@/lib/i18n';
import { ORGANS } from '@/lib/metrics';
import { useMissionStore } from '@/lib/store/missionStore';
import { WidgetBoundary } from '@/components/WidgetBoundary';
import { EcgChart } from './EcgChart';
import { RadiationCard } from './RadiationCard';
import { VitalCard } from './VitalCard';

const ic = 'size-4';

export function TelemetryGrid({ crewId }: { crewId: string }) {
  const t = useT();
  const { frame } = useDisplayFrame(crewId);
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
    read: (f: NonNullable<typeof frame>) => number, opts: { decimals?: number; value2?: number; status?: ReturnType<typeof s> } = {},
  ) => (
    <WidgetBoundary name={label} key={key}>
      <VitalCard
        crewId={crewId} label={label} icon={icon} unit={unit} value={value} value2={opts.value2}
        decimals={opts.decimals} status={opts.status ?? s(key)} read={read} tick={tick}
        highlighted={hl(key)} degraded={degraded}
      />
    </WidgetBoundary>
  );

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      <div className="col-span-full">
        <WidgetBoundary name="ECG"><EcgChart crewId={crewId} /></WidgetBoundary>
      </div>
      {card('hr', t('metric.hr'), <HeartPulse className={ic} aria-hidden />, 'bpm', v?.hr, (f) => f.vitals.hr)}
      {card('spo2', t('metric.spo2'), <Droplets className={ic} aria-hidden />, '%', v?.spo2, (f) => f.vitals.spo2)}
      <WidgetBoundary name={t('metric.bp')} key="bp">
        <VitalCard
          crewId={crewId} label={t('metric.bp')} icon={<Gauge className={ic} aria-hidden />} unit="mmHg"
          value={v?.bpSys} value2={v?.bpDia}
          status={worstStatus([s('bpSys'), s('bpDia')])}
          read={(f) => f.vitals.bpSys} tick={tick} highlighted={hl('bpSys', 'bpDia')} degraded={degraded}
        />
      </WidgetBoundary>
      {card('stress', t('metric.stress'), <Zap className={ic} aria-hidden />, 'idx', v?.stress, (f) => f.vitals.stress)}
      {card('eeg', t('metric.eeg'), <Brain className={ic} aria-hidden />, 'µV', v?.eeg, (f) => f.vitals.eeg, { decimals: 1 })}
      {card('respRate', t('metric.respRate'), <Wind className={ic} aria-hidden />, '/min', v?.respRate, (f) => f.vitals.respRate)}
      {card('hrv', t('metric.hrv'), <Activity className={ic} aria-hidden />, 'ms', v?.hrv, (f) => f.vitals.hrv)}
      {card('temp', t('metric.temp'), <Thermometer className={ic} aria-hidden />, '°C', v?.temp, (f) => f.vitals.temp, { decimals: 1 })}
      {card('o2', t('metric.o2'), <Waves className={ic} aria-hidden />, '% cabin', frame?.cabin.o2, (f) => f.cabin.o2, { decimals: 1 })}
      <div className="col-span-full">
        <WidgetBoundary name="Radiation"><RadiationCard frame={frame} crewId={crewId} tick={tick} /></WidgetBoundary>
      </div>
    </div>
  );
}
