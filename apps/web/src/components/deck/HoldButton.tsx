'use client';
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import HoldButtonBase from '@/components/HoldButton';
import { HOLD_MS } from '@/lib/constants';

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

const TONE = { danger: '#D9645A', warn: '#D9A441', calm: '#4FB6A8' };

/**
 * The Control deck's press-and-hold button (react-bits HoldButton) in the dashboard's colours: 0.8 s to confirm.
 * Letting go early, pointer cancel, sliding off the button, a hidden tab or Escape do nothing.
 */
export function HoldButton({ label, hint, icon, tone, onConfirm, disabled, compact = false }: Props) {
  return (
    <HoldButtonBase
      disabled={disabled}
      holdTime={HOLD_MS}
      onHold={onConfirm}
      backgroundColor="#17213a"
      fillColor={TONE[tone]}
      textColor="#e8eefc"
      fillTextColor="#0b1220"
      radius={16}
      icon={icon}
      doneIcon={<Check className="size-4" aria-hidden />}
      doneLabel={<span className={`whitespace-normal text-left leading-tight ${compact ? 'max-w-[5.6rem]' : ''}`}>{label}</span>}
      resetAfter={900}
      className={`w-full min-w-0 ${compact ? 'h-auto! min-h-11 px-2 py-1.5 text-xs' : 'h-auto! min-h-12 px-4 py-2 text-sm'}`}
    >
      {/* the button keeps its label on one line by default; a two-up row needs it to wrap */}
      <span className={`flex flex-col items-start text-left leading-tight whitespace-normal ${compact ? 'max-w-[5.6rem]' : ''}`}>
        <span className="font-medium">{label}</span>
        {!compact && <span className="max-w-full truncate text-xs font-normal opacity-70">{hint}</span>}
      </span>
    </HoldButtonBase>
  );
}
