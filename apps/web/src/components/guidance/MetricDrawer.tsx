'use client';
import { BookOpen, ClipboardPen, ExternalLink, X } from 'lucide-react';
import type { Status, TelemetryFrame } from '@astro/engine';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tip';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { isManualMetric } from '@astro/engine';
import { HazardChip } from './hazards';
import { aboutFor, aboutKeyOf, aboutTitleKey, pickText, RISK_URL } from '@/lib/about';
import { baseCfg } from '@/lib/engineConfig';
import { useT, type DictKey } from '@/lib/i18n';
import { formatValue } from '@/lib/logText';
import { STATUS_RANK } from '@/lib/metrics';
import { normText } from '@/lib/norms';
import { useMissionStore } from '@/lib/store/missionStore';


/** Metrics behind one about-entry: blood pressure is two readings. */
const READINGS: Record<string, string[]> = { bp: ['bpSys', 'bpDia'] };

function readingOf(frame: TelemetryFrame | undefined, m: string): number | undefined {
  if (!frame) return undefined;
  const v = (frame.vitals as unknown as Record<string, number>)[m] ?? (frame.cabin as unknown as Record<string, number>)[m];
  if (v !== undefined) return v;
  const manual = (frame.manual as Record<string, { value: number }> | undefined)?.[m];
  if (manual) return manual.value;
  if (m === 'doseRate') return frame.radiation.doseRateUSvH;
  if (m === 'dose') return frame.radiation.cumulativeMSv;
  return undefined;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      <div className="text-sm leading-relaxed text-bone">{children}</div>
    </section>
  );
}

/**
 * "About this indicator": a right-hand window that explains one reading in plain language: why it matters, what
 * spaceflight does to it, how it is measured, when to seek help, and which NASA HRP hazards and risks it relates to.
 * Opens from a card title or an organ-popover row; it only reads, never touches the live pipeline.
 */
export function MetricDrawer() {
  const t = useT();
  const locale = useMissionStore((s) => s.locale);
  const opened = useMissionStore((s) => s.metricDrawer);
  const key = opened ? aboutKeyOf(opened) : null;
  const close = useMissionStore((s) => s.closeMetric);
  const crewId = useMissionStore((s) => s.selectedCrewId);
  const openSelfCheck = useMissionStore((s) => s.openSelfCheck);
  const frame = useMissionStore((s) => s.latest[crewId]);
  const about = key ? aboutFor(key) : undefined;

  const metrics = key ? READINGS[key] ?? [key] : [];
  const status = metrics.reduce<Status>((w, m) => {
    const s = frame?.status.byMetric[m] ?? 'NOMINAL';
    return STATUS_RANK[s] > STATUS_RANK[w] ? s : w;
  }, 'NOMINAL');
  const reading = metrics.map((m) => formatValue(m, readingOf(frame, m))).filter(Boolean);
  const norm = metrics[0] ? normText(metrics[0], frame?.exercise) : undefined;
  const th = metrics[0] ? baseCfg.thresholds.metrics[metrics[0]] : undefined;
  const name = key ? t(aboutTitleKey(key)) : '';
  const manual = !!key && isManualMetric(key);

  return (
    <Drawer open={!!key && !!about} onOpenChange={(o) => !o && close()}>
      <DrawerContent className="w-[min(460px,100vw)]">
        {key && about && (
          <>
            <DrawerHeader className="flex-row items-start justify-between gap-3 pb-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <BookOpen className="size-3.5" aria-hidden /> {t('about.title')}
                </p>
                <DrawerTitle className="mt-0.5 truncate">{name}</DrawerTitle>
                <DrawerDescription className="sr-only">{t('about.note')}</DrawerDescription>
              </div>
              <Tip label={t('about.close')}><DrawerClose asChild><Button variant="ghost" size="icon" className="size-8 shrink-0 rounded-full" aria-label={t('about.close')}><X className="size-4" /></Button></DrawerClose></Tip>
            </DrawerHeader>

            <div className="thin-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-cell px-3.5 py-2.5">
                <span className="text-xs text-muted-foreground">{t('about.now')}</span>
                {manual && reading.length === 0 ? (
                  <span className="text-sm text-muted-foreground">{t('about.notEntered')}</span>
                ) : (
                  <>
                    <span className="num text-lg font-medium">{reading.join(' / ') || '—'}</span>
                    <StatusBadge status={status} />
                  </>
                )}
                {norm && <span className="num ml-auto text-xs text-muted-foreground">{t('norm.label')}: {norm}</span>}
                {th?.tier && <p className="w-full text-[11px] leading-snug text-muted-foreground">{t(`limit.${th.tier}` as DictKey)}{th.source ? `. ${th.source}` : ''}</p>}
              </div>

              {manual && (
                <Button
                  type="button" variant="secondary" className="w-full justify-center"
                  onClick={() => { close(); openSelfCheck(key); }}
                >
                  <ClipboardPen aria-hidden /> {t('about.record')}: {name}
                </Button>
              )}

              <Section title={t('about.why')}>{pickText(about.why, locale)}</Section>
              <Section title={t('about.inSpace')}>{pickText(about.inSpace, locale)}</Section>
              <Section title={t('about.how')}>{pickText(about.how, locale)}</Section>
              <Section title={t('about.redFlags')}>{pickText(about.redFlags, locale)}</Section>

              <Section title={t('about.hazards')}>
                <ul className="flex flex-wrap gap-1.5">
                  {about.hazards.map((h) => <li key={h}><HazardChip hazard={h} /></li>)}
                </ul>
              </Section>
              <Section title={t('about.risks')}>
                <ul className="list-disc space-y-0.5 pl-4 text-[13px] text-muted-foreground marker:text-muted-foreground/50">
                  {about.risks.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </Section>

              <footer className="mt-auto flex flex-col gap-1.5 border-t border-white/8 pt-3 text-[11px] leading-snug text-muted-foreground">
                <p>{t('about.note')}</p>
                <a href={RISK_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal hover:underline">
                  {t('about.source')} <ExternalLink className="size-3" aria-hidden />
                </a>
              </footer>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
