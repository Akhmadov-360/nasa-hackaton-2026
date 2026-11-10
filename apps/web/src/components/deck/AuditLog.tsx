'use client';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Download, Info, Radio, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useT } from '@/lib/i18n';
import { downloadLogCsv } from '@/lib/exportCsv';
import { logText } from '@/lib/logText';
import { formatMet, STATUS_COLOR } from '@/lib/metrics';
import { useMissionStore, type LogEntry } from '@/lib/store/missionStore';

const ICON = { alert: AlertTriangle, command: Terminal, link: Radio, system: Info };
type Filter = 'all' | 'alerts' | 'commands';

function Row({ e }: { e: LogEntry }) {
  const locale = useMissionStore((s) => s.locale);
  const Icon = ICON[e.kind];
  const color = e.severity ? STATUS_COLOR[e.severity] : 'var(--color-muted-foreground)';
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="flex gap-2 py-1.5 text-[13px]"
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" style={{ color }} aria-hidden />
      <div className="min-w-0">
        <p className="num text-xs text-muted-foreground">{formatMet(e.t)}</p>
        <p className="break-words">{logText(e, locale)}</p>
      </div>
    </motion.li>
  );
}

/** Black-box audit trail: every alert, link change and operator command, stamped with MET. */
export function AuditLog() {
  const t = useT();
  const audit = useMissionStore((s) => s.audit);
  const locale = useMissionStore((s) => s.locale);
  const [filter, setFilter] = useState<Filter>('all');
  const rows = useMemo(() => {
    const f = audit.filter((e) => filter === 'all' || (filter === 'alerts' ? e.kind === 'alert' : e.kind === 'command'));
    return f.slice(-60).reverse();
  }, [audit, filter]);

  return (
    <section className="flex max-h-80 min-h-0 flex-1 flex-col gap-2 p-4 lg:max-h-none" aria-label={t('log.title')}>
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">{t('log.title')}</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => downloadLogCsv(audit, locale)} disabled={!audit.length} aria-label={t('log.export')}>
              <Download />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('log.export')}</TooltipContent>
        </Tooltip>
      </header>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList aria-label={t('log.title')}>
          <TabsTrigger value="all">{t('log.tab.all')}</TabsTrigger>
          <TabsTrigger value="alerts">{t('log.tab.alerts')}</TabsTrigger>
          <TabsTrigger value="commands">{t('log.tab.commands')}</TabsTrigger>
        </TabsList>
      </Tabs>
      <ScrollArea className="min-h-0 flex-1">
        <ul className="divide-y divide-white/5 pr-2">
          <AnimatePresence initial={false}>{rows.map((e) => <Row key={e.id} e={e} />)}</AnimatePresence>
          {!rows.length && <li className="py-2 text-xs text-muted-foreground">{t('log.empty')}</li>}
        </ul>
      </ScrollArea>
    </section>
  );
}
