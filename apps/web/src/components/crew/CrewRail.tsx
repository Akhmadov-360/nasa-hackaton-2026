'use client';
import { useLayoutEffect, useRef, useState } from 'react';
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
        data-avatar
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

/** Slot size used to place the liquid indicator. Measured from the real buttons, so it also works in the horizontal mobile rail. */
function useSlotCenter(selected: string, count: number) {
  const nav = useRef<HTMLElement>(null);
  const slots = useRef<Record<string, HTMLDivElement | null>>({});
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useLayoutEffect(() => {
    // centre of the avatar circle itself (not of the slot, which also holds the name below it)
    const measure = () => {
      const avatar = slots.current[selected]?.querySelector('[data-avatar]');
      const n = nav.current;
      if (!avatar || !n) return;
      const a = avatar.getBoundingClientRect();
      const r = n.getBoundingClientRect();
      setPos({ x: a.left - r.left - n.clientLeft + a.width / 2, y: a.top - r.top - n.clientTop + a.height / 2 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (nav.current) ro.observe(nav.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [selected, count]);
  return { nav, slots, pos };
}

/**
 * One liquid indicator for the whole rail. Three blobs chase the selected avatar with different spring stiffness;
 * the goo filter fuses them, so on a jump the drop stretches into a thread, thins out and snaps onto the new avatar.
 */
export function CrewRail() {
  const t = useT();
  const selected = useMissionStore((s) => s.selectedCrewId);
  const reduce = useReducedMotion();
  const { nav, slots, pos } = useSlotCenter(selected, crew.length);
  const spring = (stiffness: number, damping: number) => (reduce ? { duration: 0 } : { type: 'spring' as const, stiffness, damping, mass: 0.9 });
  const blob = (size: number, stiffness: number, damping: number) => (
    <motion.div
      className="absolute top-0 left-0 rounded-full bg-teal"
      style={{ width: size, height: size }}
      initial={false}
      animate={{ x: pos.x - size / 2, y: pos.y - size / 2 }}
      transition={spring(stiffness, damping)}
    />
  );
  return (
    <nav ref={nav} aria-label={t('crew.title')} className="relative flex flex-row items-stretch gap-1 border-b border-white/[0.06] bg-rail p-2 lg:flex-col lg:border-r lg:border-b-0 lg:p-3">
      <h2 className="sr-only">{t('crew.title')}</h2>
      {/* liquid layer: solid blobs under the goo filter, dimmed as a whole so the avatars stay readable */}
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ filter: 'url(#goo-rail)' }} aria-hidden>
        {blob(36, 70, 11)}
        {blob(50, 150, 16)}
        {blob(62, 320, 28)}
      </div>
      {crew.map((c) => (
        <div key={c.id} ref={(el) => { slots.current[c.id] = el; }} className="relative z-10 flex-1 lg:flex-none">
          <WidgetBoundary name={c.name}><CrewButton id={c.id} name={c.name} role={c.role} /></WidgetBoundary>
        </div>
      ))}
    </nav>
  );
}
