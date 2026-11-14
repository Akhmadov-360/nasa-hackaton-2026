'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { sileo } from 'sileo';
import { MANUAL, validManualValue, type ManualEntry, type ManualMetric } from '@astro/engine';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tip';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Segmented } from '@/components/ui/segmented';
import { crewName } from '@/lib/engineConfig';
import { useT, type DictKey } from '@/lib/i18n';
import { formatValue } from '@/lib/logText';
import { recordMeasurement, removeMeasurement } from '@/lib/runtime';
import { useMissionStore } from '@/lib/store/missionStore';
import { SelfCheckProvider, type SelfCheckApi } from './context';
import { EntryList } from './EntryList';
import { GlucosePanel, MoodPanel, SleepPanel, WaterPanel } from './panels';

/** "When was it measured?": the time is taken automatically; an earlier one can be chosen. */
const WHEN = [0, 15, 60, 180, 480] as const;

/** What a saved value reads like in a toast ("3 /5" is not friendly, so mood uses its word). */
const shown = (t: ReturnType<typeof useT>, metric: ManualMetric, value: number) =>
  metric === 'mood' ? t(`selfcheck.mood.${value}` as DictKey) : formatValue(metric, value);

/**
 * Self-check: the crew member enters glucose, sleep, mood and water, and can correct or remove what was entered.
 * Every entry is a `measurement` event (validated here and again by the API) stamped with the mission time and the
 * wall-clock time, so it appears in the flight log, the report, the Excel export and Time Travel.
 */
export function SelfCheckDrawer() {
  const t = useT();
  const { open, metric: focus } = useMissionStore((s) => s.selfCheck);
  const close = useMissionStore((s) => s.closeSelfCheck);
  const crewId = useMissionStore((s) => s.selectedCrewId);

  const [ago, setAgo] = useState('0');
  const [editing, setEditing] = useState<ManualEntry | null>(null);

  // a fresh form each time it opens or the crew member changes
  useEffect(() => { if (open) { setAgo('0'); setEditing(null); } }, [open, crewId]);

  const save = useCallback<SelfCheckApi['save']>((metric, value) => {
    const spec = MANUAL[metric];
    if (!validManualValue(metric, value)) return t(spec.integer ? 'selfcheck.whole' : 'selfcheck.range', { min: spec.min, max: spec.max });
    if (editing && editing.metric === metric) {
      // a correction keeps the time of the entry: the old one is removed and a new one takes its place
      if (editing.id) removeMeasurement(crewId, metric, editing.id, editing.value);
      recordMeasurement(crewId, metric, value, 0, { t: editing.t, at: editing.at });
      setEditing(null);
      sileo.success({ title: t(`metric.${metric}` as DictKey), description: t('selfcheck.updated', { value: shown(t, metric, value) }), duration: 3500 });
    } else {
      recordMeasurement(crewId, metric, value, Number(ago) * 60);
      sileo.success({ title: t(`metric.${metric}` as DictKey), description: t('selfcheck.saved', { value: shown(t, metric, value) }), duration: 3500 });
    }
    return undefined;
  }, [ago, crewId, editing, t]);

  const remove = useCallback<SelfCheckApi['remove']>((e) => {
    if (!e.id) return;
    removeMeasurement(crewId, e.metric, e.id, e.value);
    if (editing?.id === e.id) setEditing(null);
    sileo.info({
      title: t(`metric.${e.metric}` as DictKey),
      description: t('selfcheck.removed', { value: shown(t, e.metric, e.value) }),
      duration: 7000,
      button: { title: t('deck.undo'), onClick: () => { recordMeasurement(crewId, e.metric, e.value, 0, { t: e.t, at: e.at }); sileo.success({ title: t('selfcheck.restored'), duration: 2500 }); } },
    });
  }, [crewId, editing, t]);

  const api = useMemo<SelfCheckApi>(() => ({
    crewId, agoSec: Number(ago) * 60, editing, startEdit: setEditing, stopEdit: () => setEditing(null), save, remove,
  }), [crewId, ago, editing, save, remove]);

  return (
    <Drawer open={open} onOpenChange={(o) => !o && close()}>
      <DrawerContent className="w-[min(460px,100vw)]">
        <DrawerHeader className="flex-row items-start justify-between gap-3 pb-3">
          <div className="min-w-0">
            <DrawerTitle>{t('selfcheck.title')}</DrawerTitle>
            <DrawerDescription>{t('selfcheck.for', { name: crewName(crewId) })}</DrawerDescription>
          </div>
          <Tip label={t('about.close')}><DrawerClose asChild><Button variant="ghost" size="icon" className="size-8 shrink-0 rounded-full" aria-label={t('about.close')}><X className="size-4" /></Button></DrawerClose></Tip>
        </DrawerHeader>

        {/* data-vaul-no-drag: dragging a slider or a field must never drag the window itself */}
        <div data-vaul-no-drag className="thin-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-5">
          {!editing && (
            <section aria-labelledby="sc-when" className="flex flex-col gap-1.5">
              <h3 id="sc-when" className="text-sm font-medium">{t('selfcheck.when.label')}</h3>
              <Segmented
                items={WHEN.map((m) => ({ value: String(m), label: <span className="px-0.5 text-xs">{t(`selfcheck.when.${m === 0 ? 'now' : m}` as DictKey)}</span> }))}
                value={ago} onChange={setAgo} size="sm" label={t('selfcheck.when.label')}
              />
              <p className="text-[11px] leading-snug text-muted-foreground">{t('selfcheck.when.hint')}</p>
            </section>
          )}
          <SelfCheckProvider value={api}>
            <GlucosePanel focus={focus === 'glucose'} />
            <SleepPanel focus={focus === 'sleep'} />
            <MoodPanel focus={focus === 'mood'} />
            <WaterPanel focus={focus === 'hydration'} />
            <EntryList />
          </SelfCheckProvider>
          <p className="pt-1 text-[11px] leading-snug text-muted-foreground">{t('selfcheck.note')}</p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
