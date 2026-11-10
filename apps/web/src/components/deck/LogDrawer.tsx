'use client';
import { useMemo, useState } from 'react';
import { Download, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusBadge } from '@/components/StatusBadge';
import { crewName } from '@/lib/engineConfig';
import { downloadLogCsv } from '@/lib/exportCsv';
import { useT, metricName } from '@/lib/i18n';
import { formatValue, logText } from '@/lib/logText';
import { formatMet } from '@/lib/metrics';
import { useMissionStore } from '@/lib/store/missionStore';

type Filter = 'all' | 'alerts' | 'commands' | 'link';

/** Detailed flight log: every row with its own columns, opened in a side drawer. */
export function LogDrawer() {
  const t = useT();
  const audit = useMissionStore((s) => s.audit);
  const locale = useMissionStore((s) => s.locale);
  const [filter, setFilter] = useState<Filter>('all');
  const rows = useMemo(() => {
    const f = audit.filter((e) => filter === 'all' || (filter === 'alerts' ? e.kind === 'alert' : filter === 'commands' ? e.kind === 'command' : e.kind === 'link'));
    return [...f].reverse();
  }, [audit, filter]);

  return (
    <Drawer>
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
              <Button variant="secondary" size="sm" onClick={() => downloadLogCsv(audit, locale)} disabled={!audit.length}>
                <Download /> {t('log.export')}
              </Button>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" aria-label={t('log.close')}><X /></Button>
              </DrawerClose>
            </div>
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mt-3">
            <TabsList aria-label={t('log.title')}>
              <TabsTrigger value="all">{t('log.tab.all')}</TabsTrigger>
              <TabsTrigger value="alerts">{t('log.tab.alerts')}</TabsTrigger>
              <TabsTrigger value="commands">{t('log.tab.commands')}</TabsTrigger>
              <TabsTrigger value="link">{t('log.tab.link')}</TabsTrigger>
            </TabsList>
          </Tabs>
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
                <tr key={e.id} className="align-top">
                  <td className="num px-5 py-2.5 whitespace-nowrap text-muted-foreground">{formatMet(e.t)}</td>
                  <td className="px-2 py-2.5">{e.severity ? <StatusBadge status={e.severity} /> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-2 py-2.5 whitespace-nowrap">{e.crewId ? crewName(e.crewId) : '—'}</td>
                  <td className="px-2 py-2.5 first-letter:uppercase">{e.metric ? metricName(e.metric) : '—'}</td>
                  <td className="num px-2 py-2.5 text-right whitespace-nowrap">{formatValue(e.metric, e.value, e.unit) || '—'}</td>
                  <td className="px-5 py-2.5">{logText(e, locale)}</td>
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
