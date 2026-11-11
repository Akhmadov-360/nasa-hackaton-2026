'use client';
import { CheckCircle2, ListChecks } from 'lucide-react';
import type { CrewReport, Incident, MissionReport } from '@astro/engine';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { crewName } from '@/lib/engineConfig';
import { formatDuration } from '@/lib/duration';
import { metricName, useT, type DictKey } from '@/lib/i18n';
import { formatMet } from '@/lib/metrics';
import { allIncidents, causeText, headline, incidentTitle, peakText } from '@/lib/reportText';
import { useMissionStore } from '@/lib/store/missionStore';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-3 text-sm font-medium text-muted-foreground">{children}</h3>
);
const th = 'px-4 py-2.5 text-xs font-medium text-muted-foreground';
const plateau = 'overflow-hidden rounded-2xl bg-cell';

const initials = (id: string) => crewName(id).split(' ').map((p) => p[0]).join('');
const fmt1 = (v: number | undefined, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '—');

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 flex-1 px-5 py-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="num mt-1 text-3xl leading-none font-medium">{value}</p>
      <p className="mt-1.5 h-4 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

export function Summary({ report, crewIds }: { report: MissionReport; crewIds?: string[] }) {
  const t = useT();
  const locale = useMissionStore((s) => s.locale);
  const crew = report.crew.filter((c) => !crewIds || crewIds.includes(c.crewId));
  const incidents = allIncidents(report, crewIds);
  const affected = crew.filter((c) => c.incidents.length).length;
  const o2 = Math.min(...crew.map((c) => c.stats.spo2?.min ?? Infinity));
  const rad = crew.length ? crew.reduce((a, c) => a + c.radiation.deltaMSv, 0) / crew.length : 0;
  const radTotal = crew.length ? crew.reduce((a, c) => a + c.radiation.endMSv, 0) / crew.length : 0;
  const clean = incidents.length === 0;
  return (
    <section aria-labelledby="rep-summary">
      <h3 id="rep-summary" className="sr-only">{t('report.summary')}</h3>
      <div className="flex items-start gap-3">
        {clean && <CheckCircle2 className="mt-1 size-6 shrink-0 text-teal" aria-hidden />}
        <p className="max-w-3xl text-xl leading-snug font-medium text-balance">{headline(report, locale, crewIds)}</p>
      </div>
      <div className={`${plateau} mt-5 flex flex-col sm:flex-row`}>
        <Stat label={t('report.stat.incidents')} value={String(incidents.length)} />
        <Separator orientation="vertical" className="hidden self-stretch sm:block data-[orientation=vertical]:h-auto" />
        <Separator className="sm:hidden" />
        <Stat label={t('report.stat.affected')} value={`${affected} / ${crew.length}`} />
        <Separator orientation="vertical" className="hidden self-stretch sm:block data-[orientation=vertical]:h-auto" />
        <Separator className="sm:hidden" />
        <Stat label={t('report.stat.o2')} value={Number.isFinite(o2) ? `${fmt1(o2)} %` : '—'} />
        <Separator orientation="vertical" className="hidden self-stretch sm:block data-[orientation=vertical]:h-auto" />
        <Separator className="sm:hidden" />
        <Stat label={t('report.stat.rad')} value={`${rad.toFixed(3)} mSv`} sub={t('report.stat.radTotal', { v: radTotal.toFixed(3) })} />
      </div>
    </section>
  );
}

/** A short period must never hide what happened earlier: say so and offer the whole session. */
export function EarlierNotice({ report, crewIds, onShowAll }: { report: MissionReport; crewIds?: string[]; onShowAll: () => void }) {
  const t = useT();
  const list = (report.earlier?.incidents ?? []).filter((i) => !crewIds || crewIds.includes(i.crewId));
  if (!list.length) return null;
  const last = list[list.length - 1];
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber/10 px-5 py-3.5 text-sm" aria-label={t('report.earlier.title')}>
      <p className="text-amber">
        <span className="font-medium">{t('report.earlier.title')}. </span>
        {t('report.earlier.some', { n: String(list.length), met: formatMet(last.endT), what: `${crewName(last.crewId)}, ${metricName(last.primaryMetric)}` })}
      </p>
      <Button variant="outline" size="sm" onClick={onShowAll}>{t('report.earlier.show')}</Button>
    </section>
  );
}

export function CrewOverview({ report, crewIds }: { report: MissionReport; crewIds?: string[] }) {
  const t = useT();
  const rows: CrewReport[] = report.crew.filter((c) => !crewIds || crewIds.includes(c.crewId));
  return (
    <section>
      <SectionTitle>{t('report.crew.title')}</SectionTitle>
      <div className={plateau}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>{t('report.col.crew')}</th>
                <th className={th}>{t('report.col.state')}</th>
                <th className={`${th} text-right`}>{t('report.col.incidents')}</th>
                <th className={`${th} text-right`}>{t('report.col.o2')}</th>
                <th className={`${th} text-right`}>{t('report.col.hr')}</th>
                <th className={`${th} text-right`}>{t('report.col.rad')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((c) => (
                <tr key={c.crewId}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span className="grid size-8 place-items-center rounded-full bg-white/[0.07] text-xs font-semibold">{initials(c.crewId)}</span>
                      <span className="font-medium">{crewName(c.crewId)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.worst} /></td>
                  <td className="num px-4 py-3 text-right">{c.incidents.length}</td>
                  <td className="num px-4 py-3 text-right whitespace-nowrap">{fmt1(c.stats.spo2?.min)} %</td>
                  <td className="num px-4 py-3 text-right whitespace-nowrap">{fmt1(c.stats.hr?.min)}–{fmt1(c.stats.hr?.max)} bpm</td>
                  <td className="num px-4 py-3 text-right whitespace-nowrap">{c.radiation.deltaMSv.toFixed(3)} mSv</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function IncidentRow({ inc, onProtocol }: { inc: Incident; onProtocol: (inc: Incident) => void }) {
  const t = useT();
  const locale = useMissionStore((s) => s.locale);
  return (
    <li className="grid gap-4 px-5 py-4 md:grid-cols-[170px_minmax(0,1fr)_auto] md:items-start">
      <div>
        <StatusBadge status={inc.worst} />
        <p className="num mt-2 text-sm">{formatMet(inc.startT)}</p>
        <p className="text-xs text-muted-foreground">{formatDuration(inc.durationSec, locale)}</p>
      </div>
      <div className="min-w-0">
        <p className="text-base font-semibold">{incidentTitle(inc, locale)}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{crewName(inc.crewId)}</p>
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">{t('report.inc.worst')}</dt>
          <dd className="num">{metricName(inc.primaryMetric, locale).replace(/^./, (c) => c.toUpperCase())} · {peakText(inc)}</dd>
          <dt className="text-muted-foreground">{t('report.inc.metrics')}</dt>
          <dd className="flex flex-wrap gap-1.5">
            {inc.metrics.map((m) => <Badge key={m} variant="outline">{metricName(m, locale)}</Badge>)}
          </dd>
          <dt className="text-muted-foreground">{t('report.inc.cause')}</dt>
          <dd>{causeText(inc, locale)}</dd>
        </dl>
      </div>
      <Button variant="secondary" size="sm" onClick={() => onProtocol(inc)} className="no-print md:mt-0.5">
        <ListChecks /> {t('report.inc.protocol')}
      </Button>
    </li>
  );
}

export function Incidents({ report, crewIds, onProtocol }: { report: MissionReport; crewIds?: string[]; onProtocol: (inc: Incident) => void }) {
  const t = useT();
  const list = allIncidents(report, crewIds);
  return (
    <section>
      <SectionTitle>{t('report.inc.title')}</SectionTitle>
      <div className={plateau}>
        {list.length ? (
          <ul className="divide-y divide-white/10">
            {list.map((inc) => <IncidentRow key={inc.id} inc={inc} onProtocol={onProtocol} />)}
          </ul>
        ) : (
          <p className="flex items-center gap-3 px-5 py-6 text-sm text-muted-foreground"><CheckCircle2 className="size-5 text-teal" aria-hidden /> {t('report.inc.empty')}</p>
        )}
      </div>
    </section>
  );
}

export function RadiationSection({ report, crewIds }: { report: MissionReport; crewIds?: string[] }) {
  const t = useT();
  const rows = report.crew.filter((c) => !crewIds || crewIds.includes(c.crewId));
  return (
    <section>
      <SectionTitle>{t('report.rad.title')}</SectionTitle>
      <div className={plateau}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>{t('report.col.crew')}</th>
                <th className={`${th} text-right`}>{t('report.rad.start')}</th>
                <th className={`${th} text-right`}>{t('report.rad.end')}</th>
                <th className={`${th} text-right`}>{t('report.rad.added')}</th>
                <th className={`${th} text-right`}>{t('report.rad.peak')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((c) => (
                <tr key={c.crewId}>
                  <td className="px-4 py-3 font-medium">{crewName(c.crewId)}</td>
                  <td className="num px-4 py-3 text-right">{c.radiation.startMSv.toFixed(3)} mSv</td>
                  <td className="num px-4 py-3 text-right">{c.radiation.endMSv.toFixed(3)} mSv</td>
                  <td className="num px-4 py-3 text-right">{c.radiation.deltaMSv.toFixed(3)} mSv</td>
                  <td className="num px-4 py-3 text-right">{Math.round(c.radiation.peakRateUSvH)} µSv/h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function Provenance({ report }: { report: MissionReport }) {
  const t = useT();
  return (
    <section>
      <SectionTitle>{t('report.prov.title')}</SectionTitle>
      <div className={`${plateau} space-y-4 p-5 text-sm leading-relaxed`}>
        <p className="rounded-xl bg-amber/10 px-3.5 py-2.5 text-amber">{t('report.prov.disclaimer')}</p>
        <p className="text-muted-foreground">{t('report.prov.modeled')}</p>
        {report.limits && report.limits.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('report.prov.limitsTitle')}</p>
            <div className="overflow-x-auto rounded-xl bg-white/[0.03]">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="px-3 py-2 font-medium">{t('report.prov.col.metric')}</th>
                    <th className="px-3 py-2 font-medium">{t('report.prov.col.limits')}</th>
                    <th className="px-3 py-2 font-medium">{t('report.prov.col.tier')}</th>
                    <th className="px-3 py-2 font-medium">{t('report.prov.col.source')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.limits.map((l) => (
                    <tr key={l.metric} className="border-t border-white/5 align-top">
                      <td className="px-3 py-2 whitespace-nowrap">{metricName(l.metric)}</td>
                      <td className="num px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {l.low && <div>↓ {l.low.caution} / {l.low.warning} / {l.low.critical} {l.unit}</div>}
                        {l.high && <div>↑ {l.high.caution} / {l.high.warning} / {l.high.critical} {l.unit}</div>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{t(`tier.${l.tier}` as DictKey)}</td>
                      <td className="px-3 py-2 break-words text-muted-foreground">{l.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {report.sources.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('report.prov.sources')}</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {report.sources.map((s) => <li key={s} className="break-words">{s}</li>)}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
