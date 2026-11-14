'use client';
import { useMemo, useState } from 'react';
import { Download, ListChecks, Maximize2, X } from 'lucide-react';
import { PROTOCOL_OF_METRIC } from '@astro/engine';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tip';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Segmented } from '@/components/ui/segmented';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusBadge } from '@/components/StatusBadge';
import { crewName } from '@/lib/engineConfig';
import { LogExportMenu } from './LogExportMenu';
import { useT, metricName } from '@/lib/i18n';
import { formatValue, logText } from '@/lib/logText';
import { formatMet, STATUS_RANK } from '@/lib/metrics';
import { useMissionStore, type LogEntry } from '@/lib/store/missionStore';
import { AlertsLabel, isRoutine, PinnedIncidents, seriousClass, useActiveIncidents, useUnreadAlerts } from './logParts';

type Filter = 'all' | 'alerts' | 'commands' | 'link';

/** Detailed flight log: every row with its own columns, opened in a side drawer. */
export function LogDrawer() {
  const t = useT();
  const audit = useMissionStore((s) => s.audit);
  const locale = useMissionStore((s) => s.locale);
  const openProtocol = useMissionStore((s) => s.openProtocol);
  const jumpTo = useMissionStore((s) => s.jumpTo);
  const [filter, setFilter] = useState<Filter>('all');
  const [isOpen, setIsOpen] = useState(false);
  const unread = useUnreadAlerts(filter, ['all', 'alerts']);
  const active = useActiveIncidents();
  const pinnedKeys = useMemo(() => new Set(active.map((e) => `${e.crewId}:${e.metric}`)), [active]);
  const rows = useMemo(() => {
    const f = audit.filter((e) => filter === 'all' || (filter === 'alerts' ? e.kind === 'alert' : filter === 'commands' ? e.kind === 'command' : e.kind === 'link'));
    return [...f].filter((e) => !(e.kind === 'alert' && pinnedKeys.has(`${e.crewId}:${e.metric}`) && STATUS_RANK[e.severity ?? 'NOMINAL'] >= STATUS_RANK.WARNING)).reverse();
  }, [audit, filter, pinnedKeys]);
  /** go to the reading: select the crew member, open the tab, and get the drawer out of the way */
  const open = (e: LogEntry) => { jumpTo(e.crewId, e.metric); setIsOpen(false); };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DrawerTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label={t('log.details')}>
              <Maximize2 />
            </Button>
          </DrawerTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('log.details')}</TooltipContent>
      </Tooltip>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DrawerTitle>{t('log.title')}</DrawerTitle>
              <DrawerDescription>{t('log.count', { n: audit.length })}</DrawerDescription>
            </div>
            <div className="flex items-center gap-1">
              <LogExportMenu />
              <Tip label={t('log.close')}><DrawerClose asChild><Button variant="ghost" size="icon" aria-label={t('log.close')}><X /></Button></DrawerClose></Tip>
            </div>
          </div>
          <div className="mt-3">
            <Segmented
              label={t('log.title')} value={filter} onChange={(v) => setFilter(v as Filter)}
              items={[
                { value: 'all', label: t('log.tab.all') },
                { value: 'alerts', label: <AlertsLabel text={t('log.tab.alerts')} unread={unread} /> },
                { value: 'commands', label: t('log.tab.commands') },
                { value: 'link', label: t('log.tab.link') },
              ]}
            />
          </div>
          {active.length > 0 && <div className="mt-3"><PinnedIncidents onOpen={open} limit={4} /></div>}
        </DrawerHeader>
        <Separator />
        <ScrollArea className="min-h-0 flex-1">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-rail text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-medium">MET</th>
                <th className="px-2 py-2.5 font-medium">{t('log.col.status')}</th>
                <th className="px-2 py-2.5 font-medium">{t('log.col.crew')}</th>
                <th className="px-2 py-2.5 font-medium">{t('log.col.metric')}</th>
                <th className="px-2 py-2.5 text-right font-medium">{t('log.col.value')}</th>
                <th className="px-5 py-2.5 font-medium">{t('log.col.event')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {rows.map((e) => (
                <tr
                  key={e.id}
                  className={`align-top transition-colors duration-200 ${seriousClass(e)} ${isRoutine(e) ? 'opacity-60' : ''} ${e.kind === 'alert' && e.crewId ? 'cursor-pointer hover:bg-white/5' : ''}`}
                  onClick={e.kind === 'alert' && e.crewId ? () => open(e) : undefined}
                >
                  <td className="num px-5 py-2.5 whitespace-nowrap text-muted-foreground">{formatMet(e.t)}</td>
                  <td className="px-2 py-2.5">{e.severity ? <StatusBadge status={e.severity} /> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-2 py-2.5 whitespace-nowrap">{e.crewId ? crewName(e.crewId) : '—'}</td>
                  <td className="px-2 py-2.5 first-letter:uppercase">{e.metric ? metricName(e.metric) : '—'}</td>
                  <td className="num px-2 py-2.5 text-right whitespace-nowrap">{formatValue(e.metric, e.value, e.unit) || '—'}</td>
                  <td className="px-5 py-2.5">
                    <span className="flex items-start justify-between gap-3">
                      <span>{logText(e, locale)}</span>
                      {e.kind === 'alert' && e.metric && (
                        <Button
                          variant="ghost" size="icon" className="-my-1 size-8 shrink-0" aria-label={t('protocol.open')}
                          onClick={(ev) => { ev.stopPropagation(); openProtocol({ protocolId: PROTOCOL_OF_METRIC[e.metric as string] ?? 'general', key: e.id, crewId: e.crewId, t: e.t }); }}
                        >
                          <ListChecks />
                        </Button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={6} className="px-5 py-6 text-center text-muted-foreground">{t('log.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
