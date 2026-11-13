'use client';
import { motion, useReducedMotion } from 'motion/react';
import { Timer } from 'lucide-react';
import type { Eta } from '@astro/engine';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDuration } from '@/lib/duration';
import { statusWord, useT } from '@/lib/i18n';
import { mmss } from '@/lib/norms';
import { STATUS_COLOR } from '@/lib/metrics';
import { useMissionStore } from '@/lib/store/missionStore';

/**
 * The forecast as a small capsule in the card header: only a timer, so the card never changes its shape.
 * The full sentence is in the tooltip and for screen readers; the status island carries the summary.
 */
export function ForecastPill({ eta }: { eta: Eta }) {
  const t = useT();
  const locale = useMissionStore((s) => s.locale);
  const reduce = useReducedMotion();
  const color = eta.level === 'critical' ? STATUS_COLOR.WARNING : STATUS_COLOR.CAUTION;
  const text = t('trend.eta', {
    level: statusWord(eta.level === 'critical' ? 'CRITICAL' : 'WARNING', locale).toLowerCase(),
    time: formatDuration(eta.etaSec, locale),
  });
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.span
          tabIndex={0}
          role="img"
          aria-label={text}
          initial={reduce ? false : { opacity: 0, scaleX: 0.4 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="num inline-flex h-5 origin-right cursor-help items-center gap-0.5 rounded-full px-1.5 text-[11px] font-medium"
          style={{
            color,
            background: `color-mix(in srgb, ${color} 16%, transparent)`,
            boxShadow: `0 0 12px color-mix(in srgb, ${color} 28%, transparent)`,
          }}
        >
          <Timer className="size-2.5" aria-hidden />
          {mmss(eta.etaSec)}
        </motion.span>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
