'use client';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { crewName } from '@/lib/engineConfig';
import { useT } from '@/lib/i18n';
import { metricLabel, STATUS_COLOR } from '@/lib/metrics';
import { globalStatus, useMissionStore } from '@/lib/store/missionStore';

/** "Dynamic island": a liquid pill that swells with the newest warning and settles back after 6 s. */
export function IslandPill() {
  const t = useT();
  const island = useMissionStore((s) => s.island);
  const latest = useMissionStore((s) => s.latest);
  const status = globalStatus(latest);
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!island) return;
    setOpen(true);
    const id = setTimeout(() => setOpen(false), 6000);
    return () => clearTimeout(id);
  }, [island?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 240, damping: 20, mass: 0.9 };
  const color = open && island ? STATUS_COLOR[island.severity] : STATUS_COLOR[status];
  const Icon = open && island ? (island.severity === 'CRITICAL' ? AlertOctagon : AlertTriangle) : CheckCircle2;

  return (
    <div className="relative z-40 flex h-11 w-full justify-center" role="status" aria-live="polite">
      <motion.div className="absolute top-0" animate={{ width: open ? 440 : 210, height: open ? 78 : 44 }} transition={spring} style={{ maxWidth: '92vw' }}>
        {/* liquid body: the only element with the goo filter */}
        <div className="absolute inset-0" style={{ filter: 'url(#goo)' }} aria-hidden>
          <motion.div className="absolute inset-0 rounded-[26px] bg-panel-2 shadow-lg" animate={{ borderRadius: open ? 30 : 22 }} transition={spring} />
          <motion.div
            className="absolute left-1/2 size-5 -translate-x-1/2 rounded-full bg-panel-2"
            animate={{ y: open ? 66 : 20, scale: open ? 1 : 0 }}
            transition={spring}
          />
        </div>
        <div className="relative flex h-full items-center gap-3 px-4">
          <motion.span animate={open && !reduce ? { scale: [1, 1.25, 1, 1.18, 1] } : { scale: 1 }} transition={{ duration: 0.9 }} className="shrink-0" style={{ color }}>
            <Icon className="size-5" aria-hidden />
          </motion.span>
          <div className="min-w-0 flex-1 leading-tight">
            {open && island ? (
              <>
                <p className="truncate text-sm font-semibold" style={{ color }}>
                  {crewName(island.crewId)} · {metricLabel(island.metric)}
                </p>
                <p className="num truncate text-xs text-mist">{island.message}</p>
              </>
            ) : (
              <p className="text-center text-sm font-medium" style={{ color }}>{t(`status.${status}` as const)}</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
