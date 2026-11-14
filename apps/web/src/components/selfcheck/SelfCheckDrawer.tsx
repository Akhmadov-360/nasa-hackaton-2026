'use client';
import { useEffect, useState } from 'react';
import { Droplets, X } from 'lucide-react';
import { sileo } from 'sileo';
import { MANUAL, validManualValue, type ManualMetric } from '@astro/engine';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Segmented } from '@/components/ui/segmented';
import ElasticSlider from '@/components/ElasticSlider';
import { crewName } from '@/lib/engineConfig';
import { useT, type DictKey } from '@/lib/i18n';
import { formatValue } from '@/lib/logText';
import { sendCommand } from '@/lib/runtime';
import { useMissionStore } from '@/lib/store/missionStore';
import { WATER_SUPPLY_L } from './SelfCheckView';

const WATER_QUICK = [0.25, 0.33, 0.5, 0.75];

/** One entry: a titled panel with its hint, the control and (for the typed ones) a Save button. */
function Panel({ metric, hint, children, focus }: { metric: ManualMetric; hint: string; children: React.ReactNode; focus: boolean }) {
  const t = useT();
  return (
    <section
      aria-labelledby={`sc-${metric}`}
      className="flex flex-col gap-2.5 rounded-2xl bg-cell p-3.5 transition-shadow duration-300"
      style={focus ? { boxShadow: 'inset 3px 0 0 var(--color-teal)' } : undefined}
    >
      <div>
        <h3 id={`sc-${metric}`} className="text-sm font-medium">{t(`metric.${metric}` as DictKey)} <span className="text-xs font-normal text-muted-foreground">{MANUAL[metric].unit}</span></h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  );
}

/**
 * Self-check: the crew member enters glucose, sleep, mood and water drunk. Every entry becomes a `measurement` event
 * (validated here and again by the API), so it appears in the flight log, the report, the exports and Time Travel.
 */
export function SelfCheckDrawer() {
  const t = useT();
  const { open, metric: focus } = useMissionStore((s) => s.selfCheck);
  const close = useMissionStore((s) => s.closeSelfCheck);
  const crewId = useMissionStore((s) => s.selectedCrewId);

  const [glucose, setGlucose] = useState('');
  const [other, setOther] = useState('');
  const [sleep, setSleep] = useState(7);
  const [mood, setMood] = useState('3');
  const [error, setError] = useState<Partial<Record<ManualMetric, string>>>({});

  // a fresh form each time it opens
  useEffect(() => { if (open) { setGlucose(''); setOther(''); setError({}); } }, [open, crewId]);

  const save = (metric: ManualMetric, value: number) => {
    const spec = MANUAL[metric];
    if (!validManualValue(metric, value)) {
      setError((e) => ({ ...e, [metric]: t(spec.integer ? 'selfcheck.whole' : 'selfcheck.range', { min: spec.min, max: spec.max }) }));
      return false;
    }
    setError((e) => ({ ...e, [metric]: undefined }));
    sendCommand('measurement', crewId, { metric, value });
    sileo.success({ title: t(`metric.${metric}` as DictKey), description: t('selfcheck.saved', { value: formatValue(metric, value) }), duration: 3500 });
    return true;
  };

  const saveGlucose = () => { if (save('glucose', Number(glucose.replace(',', '.')))) setGlucose(''); };
  const saveOther = () => { if (save('hydration', Number(other.replace(',', '.')))) setOther(''); };

  const field = 'num h-10 w-full rounded-xl bg-white/6 px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <Drawer open={open} onOpenChange={(o) => !o && close()}>
      <DrawerContent className="w-[min(460px,100vw)]">
        <DrawerHeader className="flex-row items-start justify-between gap-3 pb-3">
          <div className="min-w-0">
            <DrawerTitle>{t('selfcheck.title')}</DrawerTitle>
            <DrawerDescription>{t('selfcheck.for', { name: crewName(crewId) })}</DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="size-8 shrink-0 rounded-full" aria-label={t('about.close')}><X className="size-4" /></Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="thin-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-5">
          <Panel metric="glucose" focus={focus === 'glucose'} hint={t('selfcheck.glucose.hint')}>
            <div className="flex gap-2">
              <input
                className={field} inputMode="decimal" placeholder="mg/dL" value={glucose} aria-label={t('metric.glucose')}
                aria-invalid={!!error.glucose} onChange={(e) => setGlucose(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveGlucose()}
              />
              <Button type="button" onClick={saveGlucose} disabled={!glucose.trim()}>{t('selfcheck.save')}</Button>
            </div>
            {error.glucose && <p role="alert" className="text-xs text-coral">{error.glucose}</p>}
          </Panel>

          <Panel metric="sleep" focus={focus === 'sleep'} hint={t('selfcheck.sleep.hint')}>
            <p className="num text-lg font-medium">{sleep.toFixed(1)} h</p>
            <ElasticSlider
              ariaLabel={t('metric.sleep')} value={sleep} startingValue={0} maxValue={12} isStepped stepSize={0.5}
              onChange={setSleep} leftIcon={null} rightIcon={null} valuePosition="bubble" formatValue={(v) => `${v.toFixed(1)} h`}
              thickness={8} activeThickness={14} restOpacity={1} maxStretch={12}
              trackColor="rgba(159,176,201,0.28)" rangeColor="#4FB6A8" contentColor="#9fb0c9" className="w-full"
            />
            <Button type="button" className="self-end" onClick={() => save('sleep', sleep)}>{t('selfcheck.save')}</Button>
          </Panel>

          <Panel metric="mood" focus={focus === 'mood'} hint={t('selfcheck.mood.hint')}>
            <Segmented
              items={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: <span className="num px-1">{n}</span> }))}
              value={mood} onChange={setMood} size="md" label={t('metric.mood')}
            />
            <p className="text-xs text-muted-foreground">{t(`selfcheck.mood.${mood}` as DictKey)}</p>
            <Button type="button" className="self-end" onClick={() => save('mood', Number(mood))}>{t('selfcheck.save')}</Button>
          </Panel>

          <Panel metric="hydration" focus={focus === 'hydration'} hint={t('selfcheck.water.hint')}>
            <div className="flex flex-wrap gap-2">
              {WATER_QUICK.map((l) => (
                <Button key={l} type="button" variant="secondary" onClick={() => save('hydration', l)}>
                  <Droplets aria-hidden /> +{l} L
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className={field} inputMode="decimal" placeholder={t('selfcheck.other')} value={other} aria-label={t('selfcheck.other')}
                aria-invalid={!!error.hydration} onChange={(e) => setOther(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveOther()}
              />
              <Button type="button" onClick={saveOther} disabled={!other.trim()}>{t('selfcheck.add')}</Button>
            </div>
            {error.hydration && <p role="alert" className="text-xs text-coral">{error.hydration}</p>}
            <p className="text-[11px] leading-snug text-muted-foreground">{t('selfcheck.waterRef', { l: WATER_SUPPLY_L })}</p>
          </Panel>

          <p className="mt-auto pt-1 text-[11px] leading-snug text-muted-foreground">{t('selfcheck.note')}</p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
