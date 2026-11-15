'use client';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Info, ListChecks, Radio, Terminal } from 'lucide-react';
import { PROTOCOL_OF_METRIC } from '@astro/engine';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Segmented } from '@/components/ui/segmented';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useT } from '@/lib/i18n';
import { logText } from '@/lib/logText';
import { formatMet, STATUS_COLOR, STATUS_RANK } from '@/lib/metrics';
import { useMissionStore, type LogEntry } from '@/lib/store/missionStore';
import { LogDrawer } from './LogDrawer';
import { LogExportMenu } from './LogExportMenu';
import { AlertsLabel, isRoutine, PinnedIncidents, seriousClass, useActiveIncidents, useUnreadAlerts } from './logParts';

const ICON = { alert: AlertTriangle, command: Terminal, link: Radio, system: Info };
type Filter = 'all' | 'alerts' | 'commands';

function Row({ e, onOpen }: { e: LogEntry; onOpen: (e: LogEntry) => void }) {
  const locale = useMissionStore((s) => s.locale);
  const openProtocol = useMissionStore((s) => s.openProtocol);
  const t = useT();
  const Icon = ICON[e.kind];
  const color = e.severity ? STATUS_COLOR[e.severity] : 'var(--color-muted-foreground)';
  const clickable = e.kind === 'alert' && !!e.crewId;
  const serious = !!e.severity && STATUS_RANK[e.severity] >= STATUS_RANK.WARNING && e.kind === 'alert';
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: isRoutine(e) ? 0.6 : 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={`flex gap-2 rounded-r-lg px-1 py-1.5 text-[13px] transition-colors duration-200 ${seriousClass(e)} ${clickable ? 'cursor-pointer hover:bg-white/5' : ''}`}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onOpen(e) : undefined}
      onKeyDown={clickable ? (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onOpen(e); } } : undefined}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" style={{ color }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="num flex items-center gap-2 text-xs text-muted-foreground">{formatMet(e.t)}{serious && e.severity && <StatusBadge status={e.severity} />}</p>
        <p className="break-words">{logText(e, locale)}</p>
      </div>
      {e.kind === 'alert' && e.metric && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost" size="icon" className="size-8 shrink-0 self-center" aria-label={t('protocol.open')}
              onClick={(ev) => { ev.stopPropagation(); openProtocol({ protocolId: PROTOCOL_OF_METRIC[e.metric as string] ?? 'general', key: e.id, crewId: e.crewId, t: e.t }); }}
            >
              <ListChecks />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('protocol.open')}</TooltipContent>
        </Tooltip>
      )}
    </motion.li>
  );
}

/** Black-box audit trail: every alert, link change and operator command, stamped with MET. Active alarms stay pinned on top. */
export function AuditLog() {
  const t = useT();
  const audit = useMissionStore((s) => s.audit);
  const jumpTo = useMissionStore((s) => s.jumpTo);
  const [filter, setFilter] = useState<Filter>('all');
  const unread = useUnreadAlerts(filter, ['all', 'alerts']);
  const active = useActiveIncidents();
  const pinnedKeys = useMemo(() => new Set(active.map((e) => `${e.crewId}:${e.metric}`)), [active]);
  const open = (e: LogEntry) => jumpTo(e.crewId, e.metric);
  const rows = useMemo(() => {
    const f = audit.filter((e) => filter === 'all' || (filter === 'alerts' ? e.kind === 'alert' : e.kind === 'command'));
    // an alarm that is still active is already pinned above, do not list it twice
    return f.filter((e) => !(e.kind === 'alert' && pinnedKeys.has(`${e.crewId}:${e.metric}`) && STATUS_RANK[e.severity ?? 'NOMINAL'] >= STATUS_RANK.WARNING)).slice(-60).reverse();
  }, [audit, filter, pinnedKeys]);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2 p-4" aria-label={t('log.title')}>
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">{t('log.title')}</h3>
        <div className="flex items-center">
          <LogDrawer />
          <LogExportMenu variant="ghost" size="icon" iconOnly />
        </div>
      </header>
      <Segmented
        label={t('log.title')} value={filter} onChange={(v) => setFilter(v as Filter)}
        items={[
          { value: 'all', label: t('log.tab.all') },
          { value: 'alerts', label: <AlertsLabel text={t('log.tab.alerts')} unread={unread} /> },
          { value: 'commands', label: t('log.tab.commands') },
        ]}
      />
      {/* the pinned alarms scroll with the list, so a few tall "Do now" cards never push the log out of its panel */}
      <ScrollArea className="h-96 min-h-0 flex-none xl:h-auto xl:flex-1">
        <div className="pr-2"><PinnedIncidents onOpen={open} /></div>
        <ul className="divide-y divide-white/5 pr-2">
          <AnimatePresence initial={false}>{rows.map((e) => <Row key={e.id} e={e} onOpen={open} />)}</AnimatePresence>
          {!rows.length && !active.length && <li className="py-2 text-xs text-muted-foreground">{t('log.empty')}</li>}
        </ul>
      </ScrollArea>
    </section>
  );
}
