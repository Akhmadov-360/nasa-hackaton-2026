'use client';
import { Dumbbell, RotateCcw, Sun, Trash2, Wind } from 'lucide-react';
import { crewName } from '@/lib/engineConfig';
import { useFlares } from '@/lib/flares';
import { useT } from '@/lib/i18n';
import { resetScenario, sendCommand } from '@/lib/runtime';
import { useMissionStore } from '@/lib/store/missionStore';
import { WidgetBoundary } from '@/components/WidgetBoundary';
import { AuditLog } from './AuditLog';
import { HoldButton } from './HoldButton';

export function ControlDeck() {
  const t = useT();
  const crewId = useMissionStore((s) => s.selectedCrewId);
  const ready = useMissionStore((s) => s.t > 0);
  const flare = useFlares()[0];
  const cls = flare?.classType?.[0] ?? 'X';
  const flareHint = flare ? t('deck.flareReal', { cls: flare.classType, date: flare.peakTime.slice(0, 10) }) : t('deck.target.all');
  const wait = t('deck.wait');

  return (
    <aside className="flex min-h-0 flex-col gap-3" aria-label={t('deck.title')}>
      <WidgetBoundary name={t('deck.title')}>
        <section className="glass flex flex-col gap-2 p-3.5">
          <header className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">{t('deck.title')}</h2>
            <p className="text-xs text-muted-foreground">{ready ? t('deck.hint') : wait}</p>
          </header>
          <HoldButton
            disabled={!ready} tone="danger" icon={<Sun className="size-5" aria-hidden />} label={t('deck.flare')}
            hint={flareHint} onConfirm={() => sendCommand('flare', 'ALL', { class: cls })}
          />
          <HoldButton
            disabled={!ready} tone="warn" icon={<Dumbbell className="size-5" aria-hidden />} label={t('deck.exertion')}
            hint={crewName(crewId)} onConfirm={() => sendCommand('exertion', crewId)}
          />
          <HoldButton
            disabled={!ready} tone="danger" icon={<Wind className="size-5" aria-hidden />} label={t('deck.o2')}
            hint={crewName(crewId)} onConfirm={() => sendCommand('o2fault', crewId)}
          />
          <HoldButton
            disabled={!ready} tone="calm" icon={<RotateCcw className="size-5" aria-hidden />} label={t('deck.normalize')}
            hint={t('deck.target.all')} onConfirm={() => sendCommand('normalize', 'ALL')}
          />
          <HoldButton
            disabled={!ready} tone="calm" icon={<Trash2 className="size-5" aria-hidden />} label={t('deck.reset')}
            hint={t('deck.resetHint')} onConfirm={resetScenario}
          />
        </section>
      </WidgetBoundary>
      <WidgetBoundary name={t('log.title')} className="min-h-40 flex-1"><AuditLog /></WidgetBoundary>
    </aside>
  );
}
