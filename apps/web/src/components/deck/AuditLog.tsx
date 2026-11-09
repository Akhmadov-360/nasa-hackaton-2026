'use client';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Radio, Terminal, Info } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { formatMet, STATUS_COLOR } from '@/lib/metrics';
import { useMissionStore, type LogEntry } from '@/lib/store/missionStore';

const ICON = { alert: AlertTriangle, command: Terminal, link: Radio, system: Info };

function Row({ e }: { e: LogEntry }) {
  const Icon = ICON[e.kind];
  const color = e.severity ? STATUS_COLOR[e.severity] : 'var(--color-mist)';
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="flex gap-2 py-1.5 text-xs"
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" style={{ color }} aria-hidden />
      <div className="min-w-0">
        <p className="num text-[10px] text-mist">{formatMet(e.t)}</p>
        <p className="break-words">{e.text}</p>
      </div>
    </motion.li>
  );
}

/** Black-box audit trail: every alert, link change and operator command, stamped with MET. */
export function AuditLog() {
  const t = useT();
  const audit = useMissionStore((s) => s.audit);
  const rows = audit.slice(-60).reverse();
  return (
    <section className="glass flex min-h-0 flex-1 flex-col p-4" aria-label={t('log.title')}>
      <h3 className="mb-1 text-sm font-medium text-mist">{t('log.title')}</h3>
      <ul className="thin-scroll min-h-0 flex-1 divide-y divide-white/5 overflow-y-auto pr-1" aria-live="polite">
        <AnimatePresence initial={false}>
          {rows.map((e) => <Row key={e.id} e={e} />)}
        </AnimatePresence>
        {!rows.length && <li className="py-2 text-xs text-mist">{t('log.empty')}</li>}
      </ul>
    </section>
  );
}
