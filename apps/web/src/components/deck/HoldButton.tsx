'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { Check } from 'lucide-react';
import { HoldController } from '@/lib/hold';

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
 * Press and hold for 0.8 s. Releasing early, pointer-cancel, sliding off the button, switching tabs
 * or any non-primary mouse button does nothing. While held, the fill swells like a viscous liquid from the icon
 * to the far edge.
 */
export function HoldButton({ label, hint, icon, tone, onConfirm, disabled, compact = false }: Props) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const reduce = useReducedMotion();
  const confirmRef = useRef(onConfirm);
  confirmRef.current = onConfirm;
  const doneTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hold = useMemo(
    () =>
      new HoldController(
        () => {
          confirmRef.current();
          setDone(true);
          doneTimer.current = setTimeout(() => setDone(false), 900);
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
    </>
  );
}
