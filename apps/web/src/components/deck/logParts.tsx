'use client';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { StatusBadge } from '@/components/StatusBadge';
import { crewName } from '@/lib/engineConfig';
import { useT } from '@/lib/i18n';
import { logText } from '@/lib/logText';
import { formatMet, STATUS_COLOR, STATUS_RANK } from '@/lib/metrics';
import { useMissionStore, type LogEntry } from '@/lib/store/missionStore';

const isSerious = (e: LogEntry) => e.kind === 'alert' && !!e.severity && STATUS_RANK[e.severity] >= STATUS_RANK.WARNING;
/** Routine entries (commands, link, system) sit back; alerts keep full brightness. */
export const isRoutine = (e: LogEntry) => e.kind !== 'alert';

/**
 * Alerts of readings that are still at warning or critical right now, newest first, worst first.
 * They stay pinned above the chronological list until the reading is back in range.
 */
export function useActiveIncidents(): LogEntry[] {
  const latest = useMissionStore((s) => s.latest);
  const audit = useMissionStore((s) => s.audit);
  return useMemo(() => {
    const out: LogEntry[] = [];
    for (const [crewId, frame] of Object.entries(latest)) {
      for (const [metric, status] of Object.entries(frame.status.byMetric)) {
        if (STATUS_RANK[status] < STATUS_RANK.WARNING) continue;
        for (let i = audit.length - 1; i >= 0; i--) {
          const e = audit[i];
          if (e.kind === 'alert' && e.crewId === crewId && e.metric === metric) { out.push({ ...e, severity: status }); break; }
        }
      }
    }
    return out.sort((a, b) => STATUS_RANK[b.severity!] - STATUS_RANK[a.severity!] || b.t - a.t);
  }, [latest, audit]);
}

/** Tint and left stripe of a serious row. */
export function seriousClass(e: LogEntry): string {
  if (!isSerious(e)) return '';
  return e.severity === 'CRITICAL' ? 'bg-[#D9645A]/12 border-l-2 border-[#D9645A]' : 'bg-[#D9A441]/10 border-l-2 border-[#D9A441]';
}

/** The pinned block: active warnings and emergencies, one click away from their reading. */
export function PinnedIncidents({ onOpen, limit = 3 }: { onOpen: (e: LogEntry) => void; limit?: number }) {
  const t = useT();
  const locale = useMissionStore((s) => s.locale);
  const active = useActiveIncidents();
  if (!active.length) return null;
  return (
    <ul className="space-y-1" aria-label={t('log.pinned')}>
      {active.slice(0, limit).map((e) => (
        <li key={`${e.crewId}:${e.metric}`}>
          <button
            type="button"
            onClick={() => onOpen(e)}
            className={`flex w-full cursor-pointer items-start gap-2 rounded-r-xl px-2.5 py-2 text-left text-[13px] transition-colors duration-200 outline-none hover:brightness-125 focus-visible:ring-2 focus-visible:ring-ring ${seriousClass(e)}`}
            style={{ borderColor: e.severity ? STATUS_COLOR[e.severity] : undefined }}
          >
            <span className="min-w-0 flex-1">
              <span className="num block text-xs text-muted-foreground">{formatMet(e.t)} · {e.crewId ? crewName(e.crewId) : ''}</span>
              <span className="block break-words">{logText(e, locale)}</span>
            </span>
            {e.severity && <StatusBadge status={e.severity} className="shrink-0" />}
          </button>
        </li>
      ))}
      {active.length > limit && <li className="px-2.5 text-xs text-muted-foreground">+{active.length - limit}</li>}
    </ul>
  );
}

/**
 * How many new warnings or emergencies arrived while the operator was looking at another filter
 * (such as Commands). Reset as soon as the list that shows them is opened.
 */
export function useUnreadAlerts(filter: string, shows: string[]): number {
  const audit = useMissionStore((s) => s.audit);
  const serious = useMemo(() => audit.filter(isSerious).length, [audit]);
  const [seen, setSeen] = useState(serious);
  const watching = shows.includes(filter);
  useEffect(() => { if (watching) setSeen(serious); }, [watching, serious]);
  return watching ? 0 : Math.max(0, serious - seen);
}

/** The "Alerts" tab label with a coral drop that buds out of its edge when something new arrives. */
export function AlertsLabel({ text, unread }: { text: string; unread: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-flex items-center">
      {text}
      <AnimatePresence>
        {unread > 0 && (
          <motion.span
            key="bud"
            initial={reduce ? false : { scale: 0, scaleX: 2.2, x: -14, opacity: 0.6 }}
            animate={{ scale: 1, scaleX: 1, x: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 14, mass: 0.7 }}
            className="num ml-1.5 grid size-4 place-items-center rounded-full bg-[#D9645A] text-[10px] leading-none font-semibold text-white shadow-[0_0_10px_rgba(217,100,90,0.55)]"
            role="status"
            aria-label={String(unread)}
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
