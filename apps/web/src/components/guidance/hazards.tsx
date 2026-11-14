'use client';
import { Box, Radiation, Satellite, ShieldAlert, UserRound, Weight, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tip } from '@/components/ui/tip';
import { aboutKeyOf, aboutTitleKey, hazardIndex, type Hazard } from '@/lib/about';
import { useT, type DictKey } from '@/lib/i18n';
import { useMissionStore } from '@/lib/store/missionStore';

/** The five hazards of human spaceflight (NASA Human Research Program), each with its own icon so it reads without the word. */
export const HAZARDS: Array<{ id: Hazard; Icon: LucideIcon }> = [
  { id: 'radiation', Icon: Radiation },
  { id: 'isolation', Icon: UserRound },
  { id: 'distance', Icon: Satellite },
  { id: 'gravity', Icon: Weight },
  { id: 'closed', Icon: Box },
];
const ICON = Object.fromEntries(HAZARDS.map((h) => [h.id, h.Icon])) as Record<Hazard, LucideIcon>;

/** A hazard as a small tag: icon and word. */
export function HazardChip({ hazard }: { hazard: Hazard }) {
  const t = useT();
  const Icon = ICON[hazard];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-0.5 text-xs">
      <Icon className="size-3.5 text-teal" aria-hidden /> {t(`hazard.${hazard}` as DictKey)}
    </span>
  );
}

/**
 * "The five hazards" legend: what each hazard is, in a line, and which indicators it touches. Each indicator opens its
 * About window, so the legend is also a way in to the explanations.
 */
export function HazardLegend() {
  const t = useT();
  const openMetric = useMissionStore((s) => s.openMetric);
  const index = hazardIndex();
  return (
    <Popover>
      <Tip label={t('hazard.legend.open')}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 rounded-full" aria-label={t('hazard.legend.open')}><ShieldAlert className="size-4" /></Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent align="start" collisionPadding={12} className="thin-scroll max-h-[var(--radix-popover-content-available-height)] w-[min(26rem,92vw)] overflow-y-auto p-4">
        <p className="text-sm font-medium">{t('hazard.legend.title')}</p>
        <p className="mb-3 text-xs text-muted-foreground">{t('hazard.legend.hint')}</p>
        <ul className="flex flex-col gap-3">
          {HAZARDS.map(({ id, Icon }) => (
            <li key={id} className="flex gap-2.5">
              <Icon className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
              <div className="min-w-0">
                <p className="text-[13px] font-medium">{t(`hazard.${id}` as DictKey)}</p>
                <p className="text-xs leading-snug text-muted-foreground">{t(`hazard.desc.${id}` as DictKey)}</p>
                <ul className="mt-1.5 flex flex-wrap gap-1">
                  {(index[id] ?? []).map((k) => (
                    <li key={k}>
                      <button
                        type="button" onClick={() => openMetric(k)}
                        className="cursor-pointer rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-bone transition-colors hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {t(aboutTitleKey(aboutKeyOf(k)))}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
