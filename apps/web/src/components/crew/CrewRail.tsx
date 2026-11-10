'use client';
import { motion, useReducedMotion } from 'motion/react';
import { crew } from '@/lib/engineConfig';
import { statusWord, useT } from '@/lib/i18n';
import { STATUS_COLOR } from '@/lib/metrics';
import { useMissionStore } from '@/lib/store/missionStore';
import { useDisplayFrame } from '@/hooks/useDisplayFrame';
import { WidgetBoundary } from '@/components/WidgetBoundary';

const initials = (name: string) => name.split(' ').map((p) => p[0]).join('');

/** A heartbeat blob: two overlapping circles under a soft goo filter, beating at the real heart rate. */
function PulseDot({ hr, color }: { hr: number | undefined; color: string }) {
  const period = hr && hr > 20 && hr < 250 ? 60 / hr : 1;
  return (
    <span className="relative block size-4" style={{ filter: 'url(#goo-soft)' }} aria-hidden>
      <span className="beat absolute inset-0.5 rounded-full transition-colors duration-700" style={{ background: color, animationDuration: `${period}s` }} />
      <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full transition-colors duration-700" style={{ background: color, opacity: 0.8 }} />
    </span>
  );
}

function CrewButton({ id, name, role }: { id: string; name: string; role: string }) {
  const selected = useMissionStore((s) => s.selectedCrewId === id);
  const select = useMissionStore((s) => s.selectCrew);
  const degraded = useMissionStore((s) => s.degraded[id]);
  const { frame } = useDisplayFrame(id);
  const status = frame?.status.overall ?? 'NOMINAL';
  const color = STATUS_COLOR[status];
  return (
    <button
      onClick={() => select(id)}
      aria-pressed={selected}
      aria-label={`${name}, ${role}, ${statusWord(status)}`}
      className="group relative flex h-[84px] w-full flex-col items-center justify-center gap-1 rounded-2xl"
    >
      <span
        className="relative grid size-14 place-items-center rounded-full border text-sm font-semibold transition-colors duration-500"
        style={{ borderColor: `color-mix(in srgb, ${color} 70%, transparent)`, background: 'rgba(11,18,32,0.7)' }}
      >
        {initials(name)}
        <span className="absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-ink">
          <PulseDot hr={frame?.vitals.hr} color={color} />
        </span>
      </span>
      <span className={`max-w-full truncate text-xs ${selected ? 'text-bone' : 'text-mist'}`}>
        {name.split(' ')[0]}{degraded ? ' ·est' : ''}
      </span>
    </button>
  );
}

export function CrewRail() {
  const t = useT();
  const selected = useMissionStore((s) => s.selectedCrewId);
  const reduce = useReducedMotion();
  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 190, damping: 17, mass: 0.8 };
  return (
    <nav aria-label={t('crew.title')} className="relative flex flex-row items-stretch gap-1 border-b border-white/[0.06] bg-rail p-2 lg:flex-col lg:border-r lg:border-b-0 lg:p-3">
      <h2 className="sr-only">{t('crew.title')}</h2>
      {/* liquid layer: filtered blobs only, aligned 1:1 with the buttons above it */}
      <div className="pointer-events-none absolute inset-2 flex flex-row gap-1 lg:inset-3 lg:flex-col" style={{ filter: 'url(#goo)' }} aria-hidden>
        {crew.map((c) => {
          const active = selected === c.id;
          return (
            <div key={c.id} className="relative flex h-[84px] flex-1 items-center justify-center lg:flex-none">
              <motion.div className="absolute size-[68px] rounded-full bg-teal/25" animate={{ scale: active ? 1 : 0.2, opacity: active ? 1 : 0 }} transition={spring} />
              {active && <motion.div layoutId="crew-drop" className="absolute size-9 rounded-full bg-teal/40" transition={spring} />}
            </div>
          );
        })}
      </div>
      {crew.map((c) => (
        <div key={c.id} className="relative z-10 flex-1 lg:flex-none">
          <WidgetBoundary name={c.name}><CrewButton id={c.id} name={c.name} role={c.role} /></WidgetBoundary>
        </div>
      ))}
    </nav>
  );
}
