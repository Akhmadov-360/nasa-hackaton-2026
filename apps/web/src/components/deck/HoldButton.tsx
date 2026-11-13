'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { animate, useReducedMotion } from 'motion/react';
import { Check } from 'lucide-react';
import { HoldController } from '@/lib/hold';
import { useMissionStore } from '@/lib/store/missionStore';

interface Props {
  label: string;
  hint: string;
  icon: ReactNode;
  tone: 'danger' | 'warn' | 'calm';
  onConfirm: () => void;
  disabled?: boolean;
  /** smaller, label only: for the service buttons that share a row */
  compact?: boolean;
}

const TONE = {
  danger: { solid: '#D9645A', ring: 'rgba(217,100,90,0.5)' },
  warn: { solid: '#D9A441', ring: 'rgba(217,164,65,0.5)' },
  calm: { solid: '#4FB6A8', ring: 'rgba(79,182,168,0.5)' },
};

/**
 * A droplet that leaves the button and flies into the status island, then makes the island swell:
 * the command "flows" from the deck into the control centre. A spring gives the snap on arrival.
 */
function FlyingDrop({ from, color, onDone }: { from: { x: number; y: number }; color: string; onDone: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    const island = document.querySelector('[data-island]')?.getBoundingClientRect();
    if (!el || !island) { onDone(); return; }
    const to = { x: island.left + island.width / 2, y: island.top + island.height / 2 };
    try {
      // a spring takes exactly two keyframes: it carries the position (with its overshoot, the "snap");
      // the stretch into a teardrop is a separate three-keyframe tween
      const fly = animate(el, { x: [from.x, to.x], y: [from.y, to.y] }, { type: 'spring', stiffness: 130, damping: 15, mass: 0.8 });
      const stretch = animate(el, { scaleX: [1, 0.7, 0.45], scaleY: [1, 1.5, 0.45] }, { duration: 0.7, ease: 'easeInOut' });
      fly.then(onDone);
      return () => { fly.stop(); stretch.stop(); };
    } catch {
      // a decorative animation must never take the control deck down
      onDone();
      return undefined;
    }
  }, [from.x, from.y, onDone]);
  return createPortal(
    <span
      ref={ref} aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[60] -ml-2 -mt-2 size-4 rounded-full"
      style={{ background: color, boxShadow: `0 0 14px ${color}` }}
    />,
    document.body,
  );
}

/**
 * Press and hold for 0.8 s. Releasing early, pointer-cancel, sliding off the button, switching tabs
 * or any non-primary mouse button does nothing. While held, the fill swells like a viscous liquid from the icon
 * to the far edge; on confirmation a drop tears off and flows into the status island.
 */
export function HoldButton({ label, hint, icon, tone, onConfirm, disabled, compact = false }: Props) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [drop, setDrop] = useState<{ x: number; y: number; id: number } | null>(null);
  const reduce = useReducedMotion();
  const btn = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef(onConfirm);
  confirmRef.current = onConfirm;
  const doneTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pulseIsland = useMissionStore((s) => s.pulseIsland);

  const hold = useMemo(
    () =>
      new HoldController(
        () => {
          confirmRef.current();
          setDone(true);
          doneTimer.current = setTimeout(() => setDone(false), 900);
          const r = btn.current?.getBoundingClientRect();
          if (r && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) setDrop({ x: r.left + r.width / 2, y: r.top + r.height / 2, id: Date.now() });
          else useMissionStore.getState().pulseIsland();
        },
        setProgress,
      ),
    [],
  );

  // a release anywhere (even outside the window) cancels the hold
  useEffect(() => {
    const stop = () => hold.cancel();
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('blur', stop);
      hold.cancel();
      clearTimeout(doneTimer.current);
    };
  }, [hold]);

  const c = TONE[tone];
  // the liquid: a bar plus a bulge at its front, fused by the goo filter, then dimmed as a whole
  const front = `calc(${(progress * 100).toFixed(1)}% - 14px)`;
  return (
    <>
      <button
        ref={btn}
        type="button"
        disabled={disabled}
        onPointerDown={(e) => { if (e.button === 0 && e.isPrimary) hold.start(); }}
        onPointerLeave={() => hold.cancel()}
        onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); hold.start(); } }}
        onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') hold.cancel(); }}
        onBlur={() => hold.cancel()}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={`${label}. ${hint}`}
        className={`relative flex w-full touch-none items-center overflow-hidden rounded-2xl bg-[#17213a] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] select-none transition-colors duration-200 enabled:hover:bg-[#1c2844] disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'min-h-11 gap-2 px-3 py-1.5' : 'min-h-12 gap-3 px-4 py-2'}`}
        style={{ boxShadow: progress > 0 ? `0 0 0 1px ${c.ring}` : undefined }}
      >
        <span className="pointer-events-none absolute inset-0 opacity-40" style={{ filter: reduce ? undefined : 'url(#goo)' }} aria-hidden>
          <span className="absolute inset-y-0 left-0" style={{ width: `${progress * 100}%`, background: c.solid }} />
          {progress > 0 && progress < 1 && !reduce && (
            <span
              className="absolute top-1/2 size-7 rounded-full"
              style={{ left: front, background: c.solid, transform: `translateY(-50%) scale(${0.7 + 0.9 * Math.sin(progress * Math.PI)})` }}
            />
          )}
        </span>
        <span className="relative shrink-0 text-bone">{done ? <Check className="size-5 text-teal" aria-hidden /> : icon}</span>
        <span className="relative min-w-0 leading-tight">
          <span className="block text-sm font-medium">{label}</span>
          {!compact && <span className="block truncate text-xs text-mist">{done ? '✓' : hint}</span>}
        </span>
      </button>
      {drop && <FlyingDrop key={drop.id} from={drop} color={c.solid} onDone={() => { setDrop(null); pulseIsland(); }} />}
    </>
  );
}
