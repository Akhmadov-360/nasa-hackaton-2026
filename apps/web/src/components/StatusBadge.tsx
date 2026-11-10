'use client';
import type { Status } from '@astro/engine';
import { AlertOctagon, AlertTriangle, CheckCircle2, CircleDot } from 'lucide-react';
import { useT, type DictKey } from '@/lib/i18n';
import { STATUS_COLOR } from '@/lib/metrics';

const ICON = { NOMINAL: CheckCircle2, CAUTION: CircleDot, WARNING: AlertTriangle, CRITICAL: AlertOctagon };

/** Status is always icon + word + colour, never colour alone. */
export function StatusBadge({ status, className = '' }: { status: Status; className?: string }) {
  const t = useT();
  const Icon = ICON[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
      style={{ color: STATUS_COLOR[status], background: `color-mix(in srgb, ${STATUS_COLOR[status]} 14%, transparent)` }}
    >
      <Icon className="size-3" aria-hidden />
      {t(`st.${status}` as DictKey)}
    </span>
  );
}
