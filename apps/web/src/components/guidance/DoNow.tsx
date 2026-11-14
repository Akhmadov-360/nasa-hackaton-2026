'use client';
import { motion, useReducedMotion } from 'motion/react';
import { Lightbulb } from 'lucide-react';
import { Tip } from '@/components/ui/tip';
import type { Status } from '@astro/engine';
import { guidanceFor } from '@/lib/guidance';
import { escalationFor, missionOf } from '@/lib/mission';
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
  const missionId = useMissionStore((s) => s.missionId);
  const escalation = status ? escalationFor(missionOf(missionId), status, locale) : undefined;
  if (!text || !status) return null;
  const color = STATUS_COLOR[status];
  return (
    <Tip label={t('guide.illustrative')}>
    <motion.p
      key={`${metric}:${status}`}
      initial={reduce ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={`flex items-start gap-1.5 rounded-xl px-2.5 py-1.5 text-xs leading-snug text-bone ${className}`}
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      <Lightbulb className="mt-0.5 size-3.5 shrink-0" style={{ color }} aria-hidden />
      <span>
        <span className="font-medium" style={{ color }}>{t('guide.doNow')}: </span>{text}
        {escalation && <span className="mt-1 block text-muted-foreground">{escalation}</span>}
      </span>
    </motion.p>
    </Tip>
  );
}
