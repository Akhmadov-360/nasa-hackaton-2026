'use client';
import { useState } from 'react';
import { Dumbbell, RotateCcw, Sun, Trash2, Wind } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { crewName } from '@/lib/engineConfig';
import { useFlares } from '@/lib/flares';
import { useT } from '@/lib/i18n';
import { resetScenario, sendCommand } from '@/lib/runtime';
import { useMissionStore } from '@/lib/store/missionStore';
import { Separator } from '@/components/ui/separator';
import { WidgetBoundary } from '@/components/WidgetBoundary';
import { AuditLog } from './AuditLog';
import { HoldButton } from './HoldButton';

export function ControlDeck() {
  const t = useT();
  const crewId = useMissionStore((s) => s.selectedCrewId);
  const ready = useMissionStore((s) => s.t > 0);
  const flares = useFlares();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const flare = flares.find((f) => f.id === pickedId) ?? flares[0];
  const cls = flare?.classType?.[0] ?? 'X';
  const magnitude = flare ? parseFloat(flare.classType.slice(1)) : NaN; // "X8.7" -> 8.7
  const flareHint = flare ? t('deck.flareReal', { cls: flare.classType, date: flare.peakTime.slice(0, 10) }) : t('deck.target.all');
  const wait = t('deck.wait');

  return (
    <aside className="flex min-h-0 flex-col bg-rail" aria-label={t('deck.title')}>
      <WidgetBoundary name={t('deck.title')}>
        <section className="flex flex-col gap-1.5 p-4">
          <header className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">{t('deck.title')}</h2>
            <p className="text-xs text-muted-foreground">{ready ? t('deck.hint') : wait}</p>
          </header>
          {flares.length > 1 && (
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">{t('deck.pick')}</span>
              <Select
                size="sm" ariaLabel={t('deck.pick')} value={flare?.id} menuWidth={190} align="right"
                onChange={(v) => setPickedId(v)}
                options={flares.map((f) => ({ value: f.id, label: `${f.classType} · ${f.peakTime.slice(0, 10)}` }))}
              />
            </div>
          )}
          <HoldButton
            disabled={!ready} tone="danger" icon={<Sun className="size-5" aria-hidden />} label={t('deck.flare')}
            hint={flareHint} onConfirm={() => sendCommand('flare', 'ALL', Number.isFinite(magnitude) ? { class: cls, magnitude } : { class: cls })}
          />
          <HoldButton
            disabled={!ready} tone="warn" icon={<Dumbbell className="size-5" aria-hidden />} label={t('deck.exertion')}
            hint={crewName(crewId)} onConfirm={() => sendCommand('exertion', crewId)}
          />
          <HoldButton
            disabled={!ready} tone="danger" icon={<Wind className="size-5" aria-hidden />} label={t('deck.o2')}
            hint={crewName(crewId)} onConfirm={() => sendCommand('o2fault', crewId)}
          />
          {/* the two service buttons share a row: about 60 px more room for the flight log */}
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <HoldButton
              compact disabled={!ready} tone="calm" icon={<RotateCcw className="size-4" aria-hidden />} label={t('deck.normalize')}
              hint={t('deck.target.all')} onConfirm={() => sendCommand('normalize', 'ALL')}
            />
            <HoldButton
              compact disabled={!ready} tone="calm" icon={<Trash2 className="size-4" aria-hidden />} label={t('deck.reset')}
              hint={t('deck.resetHint')} onConfirm={resetScenario}
            />
          </div>
        </section>
      </WidgetBoundary>
      <div className="px-4"><Separator /></div>
      <WidgetBoundary name={t('log.title')} className="min-h-40 flex-1"><AuditLog /></WidgetBoundary>
    </aside>
  );
}
