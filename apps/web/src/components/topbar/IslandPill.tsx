'use client';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertOctagon, AlertTriangle, CheckCircle2, CircleDot } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { STATUS_COLOR } from '@/lib/metrics';
import { globalStatus, useMissionStore } from '@/lib/store/missionStore';

const ICON = { NOMINAL: CheckCircle2, CAUTION: CircleDot, WARNING: AlertTriangle, CRITICAL: AlertOctagon };

/**
 * The mission status "island". It never carries message text: details arrive as a Sileo toast
 * that drops out of this pill (same horizontal centre, directly below). On a new alert the pill
 * swells and pushes a droplet down, which is where the toast appears.
 */
export function IslandPill() {
  const t = useT();
  const island = useMissionStore((s) => s.island);
  const latest = useMissionStore((s) => s.latest);
  const status = globalStatus(latest);
  const reduce = useReducedMotion();
  const [swell, setSwell] = useState(false);

  useEffect(() => {
    if (!island) return;
    setSwell(true);
    const id = setTimeout(() => setSwell(false), 1800);
    return () => clearTimeout(id);
  }, [island?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 240, damping: 18, mass: 0.9 };
  const color = STATUS_COLOR[status];
  const Icon = ICON[status];

  return (
    <div className="relative z-40 flex h-11 w-full justify-center" role="status" aria-live="polite">
      <motion.div className="absolute top-0" animate={{ width: swell ? 260 : 220, height: 44 }} transition={spring}>
        {/* liquid body: the only element with the goo filter */}
        <div className="absolute inset-0" style={{ filter: 'url(#goo)' }} aria-hidden>
          <motion.div className="absolute inset-0 rounded-[22px] bg-panel-2" />
          <motion.div
            className="absolute left-1/2 size-5 -translate-x-1/2 rounded-full bg-panel-2"
            animate={{ y: swell ? 40 : 14, scale: swell ? 1 : 0 }}
            transition={spring}
          />
        </div>
        <div className="relative flex h-full items-center justify-center gap-2.5 px-4" style={{ color }}>
          <motion.span
            animate={swell && !reduce ? { scale: [1, 1.3, 1, 1.2, 1] } : { scale: 1 }}
            transition={{ duration: 0.9 }}
            className="grid shrink-0 place-items-center"
          >
            <Icon className="size-[18px]" aria-hidden />
          </motion.span>
          <span className="truncate text-sm font-semibold">{t(`status.${status}` as const)}</span>
        </div>
      </motion.div>
    </div>
  );
}
