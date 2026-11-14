'use client';
import { motion, useReducedMotion } from 'motion/react';
import { Lightbulb } from 'lucide-react';
import type { Status } from '@astro/engine';
import { guidanceFor } from '@/lib/guidance';
import { useT } from '@/lib/i18n';
import { STATUS_COLOR } from '@/lib/metrics';
import { useMissionStore } from '@/lib/store/missionStore';

/**
 * "Do now": the first action for a reading that is out of range, in the interface language. A soft tinted pill that
 * settles in with a spring; it lives where there is room (pinned alarms, organ popover), never inside a metric card,
 * so cards never change size. Renders nothing for a normal reading.
 */
export function DoNow({ metric, status, value, className = '' }: { metric: string | undefined; status: Status | undefined; value?: number; className?: string }) {
  const t = useT();
  const locale = useMissionStore((s) => s.locale);
  const reduce = useReducedMotion();
  const text = metric && status ? guidanceFor(metric, status, value, locale) : undefined;
  if (!text || !status) return null;
  const color = STATUS_COLOR[status];
  return (
    <motion.p
      key={`${metric}:${status}`}
      initial={reduce ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      title={t('guide.illustrative')}
      className={`flex items-start gap-1.5 rounded-xl px-2.5 py-1.5 text-xs leading-snug text-bone ${className}`}
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      <Lightbulb className="mt-0.5 size-3.5 shrink-0" style={{ color }} aria-hidden />
      <span><span className="font-medium" style={{ color }}>{t('guide.doNow')}: </span>{text}</span>
    </motion.p>
  );
}
