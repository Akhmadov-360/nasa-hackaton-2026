'use client';
import { useState } from 'react';
import { ChevronDown, Dumbbell, RotateCcw, Sun, Trash2, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
        <section className="flex flex-col gap-2 p-4">
          <header className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">{t('deck.title')}</h2>
            <p className="text-xs text-muted-foreground">{ready ? t('deck.hint') : wait}</p>
          </header>
          {flares.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 justify-between gap-2 px-2.5 text-xs text-muted-foreground" aria-label={t('deck.pick')}>
                  <span className="truncate">{t('deck.pick')}: {flare?.classType} · {flare?.peakTime.slice(0, 10)}</span>
                  <ChevronDown className="size-3.5 opacity-60" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                {flares.map((f) => (
                  <DropdownMenuItem key={f.id} onSelect={() => setPickedId(f.id)} className={f.id === flare?.id ? 'text-primary' : undefined}>
                    {f.classType} · {f.peakTime.slice(0, 10)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
      <div className="px-4"><Separator /></div>
      <WidgetBoundary name={t('log.title')} className="min-h-40 flex-1"><AuditLog /></WidgetBoundary>
    </aside>
  );
}
