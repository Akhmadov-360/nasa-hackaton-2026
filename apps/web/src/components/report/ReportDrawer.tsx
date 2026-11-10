'use client';
import { useRef, useState } from 'react';
import { ChevronDown, Copy, Download, FileText, FileUp, Printer, X } from 'lucide-react';
import { sileo } from 'sileo';
import { buildPackage, PROTOCOL_OF_METRIC, type Incident } from '@astro/engine';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReport } from '@/hooks/useReport';
import { crew, crewName } from '@/lib/engineConfig';
import { useT, type DictKey } from '@/lib/i18n';
import { formatMet } from '@/lib/metrics';
import { downloadPackage, formatBytes, MAX_FILE_BYTES, readPackageFile } from '@/lib/packageIO';
import { reportPlainText } from '@/lib/reportText';
import { useMissionStore } from '@/lib/store/missionStore';
import { CrewOverview, Incidents, Provenance, RadiationSection, Summary } from './ReportSections';

type Period = '300' | '1800' | '3600' | 'all';

/** The report: what happened, to whom, why, and what to do. Opens from the top bar. */
export function ReportDrawer() {
  const t = useT();
  const open = useMissionStore((s) => s.reportOpen);
  const setOpen = useMissionStore((s) => s.setReportOpen);
  const locale = useMissionStore((s) => s.locale);
  const imported = useMissionStore((s) => s.imported);
  const setImported = useMissionStore((s) => s.setImported);
  const sessionId = useMissionStore((s) => s.sessionId);
  const openProtocol = useMissionStore((s) => s.openProtocol);

  const [period, setPeriod] = useState<Period>('all');
  const [crewFilter, setCrewFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const { report } = useReport(period === 'all' ? null : Number(period), open);
  const crewIds = crewFilter === 'all' ? undefined : [crewFilter];

  const importFile = async (file: File) => {
    setError(null);
    const r = await readPackageFile(file);
    if (r.ok) {
      setImported({ pkg: r.pkg, name: r.name, bytes: r.bytes });
      setCrewFilter('all');
      sileo.success({ title: t('report.import'), description: r.name, duration: 3000 });
    } else {
      setError(t(`report.err.${r.code}` as DictKey, { mb: MAX_FILE_BYTES / 1024 / 1024 }));
    }
  };

  const exportPackage = async (gzip: boolean) => {
    if (!report) return;
    const pkg = buildPackage(report, { sessionId, exportedAtT: report.toT });
    const { name, bytes } = await downloadPackage(pkg, gzip);
    sileo.success({ title: t('report.export'), description: t('report.exported', { name, size: formatBytes(bytes) }), duration: 4000 });
  };

  const copySummary = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(reportPlainText(report, locale, crewIds));
      sileo.success({ title: t('report.copied'), duration: 2500 });
    } catch {
      setError(t('report.err.invalid'));
    }
  };

  const protocolFor = (inc: Incident) =>
    openProtocol({ protocolId: inc.protocol || PROTOCOL_OF_METRIC[inc.primaryMetric] || 'general', key: inc.id, crewId: inc.crewId, t: inc.startT });

  return (
    <Drawer open={open} onOpenChange={setOpen} handleOnly>
      <DrawerContent aria-describedby={undefined} className="w-[min(1080px,100vw)]">
        <div
          className="report-doc flex min-h-0 flex-1 flex-col"
          onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) void importFile(f);
          }}
        >
          <DrawerHeader className="gap-3 pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary"><FileText className="size-5" aria-hidden /></span>
                <div>
                  <DrawerTitle className="text-xl">{t('report.title')}</DrawerTitle>
                  <DrawerDescription className="num mt-0.5">
                    {report ? t('report.range', { from: formatMet(report.fromT), to: formatMet(report.toT) }) : '—'}
                  </DrawerDescription>
                </div>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="no-print" aria-label={t('protocol.close')}><X /></Button>
              </DrawerClose>
            </div>

            <div className="no-print flex flex-wrap items-center gap-x-4 gap-y-3">
              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <TabsList aria-label={t('report.title')}>
                  {(['300', '1800', '3600', 'all'] as Period[]).map((p) => (
                    <TabsTrigger key={p} value={p} disabled={!!imported}>{t(`report.period.${p}` as DictKey)}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Tabs value={crewFilter} onValueChange={setCrewFilter}>
                <TabsList aria-label={t('report.col.crew')}>
                  <TabsTrigger value="all">{t('report.crew.all')}</TabsTrigger>
                  {crew.map((c) => <TabsTrigger key={c.id} value={c.id}>{c.name.split(' ')[0]}</TabsTrigger>)}
                </TabsList>
              </Tabs>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={copySummary} disabled={!report}><Copy /> {t('report.copy')}</Button>
                <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={!report}><Printer /> {t('report.print')}</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" disabled={!report}><Download /> {t('report.export')} <ChevronDown className="opacity-60" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => void exportPackage(false)}>{t('report.export.json')}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void exportPackage(true)}>{t('report.export.gz')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" onClick={() => fileInput.current?.click()}><FileUp /> {t('report.import')}</Button>
                <input
                  ref={fileInput} type="file" className="sr-only" tabIndex={-1} aria-hidden
                  accept=".json,.gz,application/json,application/gzip"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ''; }}
                />
              </div>
            </div>

            {imported && (
              <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/10 px-4 py-2.5 text-sm text-primary">
                <span>{t('report.imported', { name: imported.name, t: formatMet(imported.pkg.exportedAtT) })}</span>
                <Button variant="ghost" size="sm" onClick={() => setImported(null)}>{t('report.imported.back')}</Button>
              </div>
            )}
            {error && (
              <p role="alert" className="no-print flex items-start justify-between gap-3 rounded-2xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                <span>{error}</span>
                <button className="cursor-pointer rounded-md p-0.5 hover:bg-white/10" onClick={() => setError(null)} aria-label={t('protocol.close')}><X className="size-4" /></button>
              </p>
            )}
          </DrawerHeader>
          <Separator className="no-print" />

          <div className="report-scroll thin-scroll relative min-h-0 flex-1 overflow-y-auto">
            {report ? (
              <div className="space-y-9 p-5 pb-10">
                <Summary report={report} crewIds={crewIds} />
                <CrewOverview report={report} crewIds={crewIds} />
                <Incidents report={report} crewIds={crewIds} onProtocol={protocolFor} />
                <RadiationSection report={report} crewIds={crewIds} />
                <Provenance report={report} />
              </div>
            ) : (
              <div className="space-y-4 p-5" aria-busy="true">
                <p className="text-sm text-muted-foreground">{t('report.wait')}</p>
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            )}
            {dragging && (
              <div className="no-print pointer-events-none absolute inset-3 z-20 grid place-items-center rounded-3xl border-2 border-dashed border-primary bg-rail/95 text-center">
                <div>
                  <FileUp className="mx-auto size-9 text-primary" aria-hidden />
                  <p className="mt-3 text-lg font-medium">{t('report.drop')}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t('report.drop.hint')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
