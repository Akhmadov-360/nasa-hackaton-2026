'use client';
import { useQuery } from '@tanstack/react-query';
import { Dumbbell, RotateCcw, Sun, Wind } from 'lucide-react';
import { apiBase } from '@/lib/constants';
import { crewName } from '@/lib/engineConfig';
import { useT } from '@/lib/i18n';
import { sendCommand } from '@/lib/runtime';
import { useMissionStore } from '@/lib/store/missionStore';
import { WidgetBoundary } from '@/components/WidgetBoundary';
import { AuditLog } from './AuditLog';
import { HoldButton } from './HoldButton';

interface Flare { id: string; classType: string; peakTime: string }

/** Real DONKI flares, when the API has them; otherwise a generic X-class event. */
function useRealFlare(): Flare | undefined {
  const { data } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const r = await fetch(`${apiBase()}/scenarios`);
      if (!r.ok) throw new Error('scenarios');
      return (await r.json()) as { flares: Flare[] };
    },
    staleTime: 5 * 60_000,
    retry: 5,
    retryDelay: 4000,
  });
  return data?.flares?.[0];
}

export function ControlDeck() {
  const t = useT();
  const crewId = useMissionStore((s) => s.selectedCrewId);
  const flare = useRealFlare();
  const cls = flare?.classType?.[0] ?? 'X';
  const flareHint = flare ? `NASA DONKI ${flare.classType} · ${flare.peakTime.slice(0, 10)}` : t('deck.hint');

  return (
    <aside className="flex min-h-0 flex-col gap-3" aria-label={t('deck.title')}>
      <WidgetBoundary name={t('deck.title')}>
        <section className="glass flex flex-col gap-2.5 p-4">
          <h2 className="text-sm font-medium text-mist">{t('deck.title')}</h2>
          <HoldButton
            tone="danger" icon={<Sun className="size-5" aria-hidden />} label={t('deck.flare')}
            hint={`${flareHint} · ${t('deck.target.all')}`}
            onConfirm={() => sendCommand('flare', 'ALL', { class: cls })}
          />
          <HoldButton
            tone="warn" icon={<Dumbbell className="size-5" aria-hidden />} label={t('deck.exertion')}
            hint={crewName(crewId)} onConfirm={() => sendCommand('exertion', crewId)}
          />
          <HoldButton
            tone="danger" icon={<Wind className="size-5" aria-hidden />} label={t('deck.o2')}
            hint={crewName(crewId)} onConfirm={() => sendCommand('o2fault', crewId)}
          />
          <HoldButton
            tone="calm" icon={<RotateCcw className="size-5" aria-hidden />} label={t('deck.normalize')}
            hint={t('deck.target.all')} onConfirm={() => sendCommand('normalize', 'ALL')}
          />
          <p className="text-xs text-mist">{t('deck.hint')}</p>
        </section>
      </WidgetBoundary>
      <WidgetBoundary name={t('log.title')} className="min-h-40 flex-1"><AuditLog /></WidgetBoundary>
    </aside>
  );
}
