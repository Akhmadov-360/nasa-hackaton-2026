'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { HoldController } from '@/lib/hold';

interface Props {
  label: string;
  hint: string;
  icon: ReactNode;
  tone: 'danger' | 'warn' | 'calm';
  onConfirm: () => void;
  disabled?: boolean;
}

const TONE = {
  danger: { fill: 'rgba(217,100,90,0.35)', ring: 'rgba(217,100,90,0.5)' },
  warn: { fill: 'rgba(217,164,65,0.32)', ring: 'rgba(217,164,65,0.5)' },
  calm: { fill: 'rgba(79,182,168,0.3)', ring: 'rgba(79,182,168,0.5)' },
};

/**
 * Press and hold for 0.8 s. Releasing early, pointer-cancel, sliding off the button, switching tabs
 * or any non-primary mouse button does nothing.
 */
export function HoldButton({ label, hint, icon, tone, onConfirm, disabled }: Props) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
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
  return (
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
      className="relative flex min-h-14 w-full touch-none items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-panel-2/70 px-4 py-2.5 text-left select-none transition-colors enabled:hover:bg-panel-2 disabled:cursor-not-allowed disabled:opacity-50"
      style={{ boxShadow: progress > 0 ? `0 0 0 1px ${c.ring}` : undefined }}
    >
      <span className="absolute inset-y-0 left-0 origin-left" style={{ width: '100%', background: c.fill, transform: `scaleX(${progress})` }} aria-hidden />
      <span className="relative shrink-0 text-bone">{done ? <Check className="size-5 text-teal" aria-hidden /> : icon}</span>
      <span className="relative min-w-0 leading-tight">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block truncate text-xs text-mist">{done ? '✓' : hint}</span>
      </span>
    </button>
  );
}
