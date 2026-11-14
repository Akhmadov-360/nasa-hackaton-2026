'use client';
import { useEffect, useRef, useState } from 'react';
import { animate, svg } from 'animejs';
import { worstStatus, type Status } from '@astro/engine';
import { DoNow } from '@/components/guidance/DoNow';
import { StatusBadge } from '@/components/StatusBadge';
import { Tip } from '@/components/ui/tip';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useDisplayFrame } from '@/hooks/useDisplayFrame';
import { organAbout } from '@/lib/about';
import { useT, metricName, statusWord, type DictKey } from '@/lib/i18n';
import { formatValue } from '@/lib/logText';
import { ORGANS, STATUS_COLOR, STATUS_RANK } from '@/lib/metrics';
import { useMissionStore } from '@/lib/store/missionStore';
import { Mars, Venus } from 'lucide-react';
import { crewSex } from '@/lib/engineConfig';
import { ALL_PARTS, bodyParts, MUSCLE_PARTS, widthFactor } from './bodyModel';

type OrganId = (typeof ORGANS)[number]['id'];

/* ------------------------------------------------------------------------------------------------
 * Front-view anatomy figure (`bodyModel.ts`, 100 x 200 polygons per muscle group) placed on a 240 x 520 canvas
 * with MODEL_TRANSFORM, and the organs drawn inside it like an x-ray. The organ shapes below are in the figure's own
 * units. The organ ids (brain, heart, lungs, muscle) and the marker positions are what the rest of the app uses.
 * ---------------------------------------------------------------------------------------------- */

const MODEL_TRANSFORM = 'translate(0 25) scale(2.4)';
const BRAIN = 'M42 11 C41 4 46 1.5 49.5 3.5 C53 1.5 58 4 57 11 C57.5 15 53 17 49.5 15.5 C46 17 41.5 15 42 11 Z';
/** The viewer's left lung; mirrored about the figure's centre line for the other one. */
const LUNG = 'M47 43 C41 42 34 46 33 53 C33 57 37 58.5 41 57.5 C45 57 47 55 47.5 51 Z';
const HEART = 'M57 59 C52 55 50 51.5 51 49 C52 46.5 55.5 46 57 48.5 C58.5 46 62 46.5 63 49 C64 51.5 62 55 57 59 Z';
const MIRROR = 'translate(99 0) scale(-1 1)';

/** Marker (dot) positions in canvas units, with the popover side for each organ. */
const MARKERS: Record<OrganId, Array<{ x: number; y: number }>> = {
  brain: [{ x: 119, y: 49 }],
  heart: [{ x: 137, y: 152 }],
  lungs: [{ x: 96, y: 146 }, { x: 146, y: 134 }],
  muscle: [{ x: 46, y: 170 }, { x: 192, y: 170 }, { x: 91, y: 314 }, { x: 147, y: 314 }],
};
const POPOVER: Record<OrganId, { x: number; y: number; side: 'left' | 'right' }> = {
  brain: { x: 119, y: 49, side: 'right' },
  heart: { x: 137, y: 152, side: 'right' },
  lungs: { x: 96, y: 146, side: 'left' },
  muscle: { x: 91, y: 314, side: 'right' },
};
const W = 240;
const H = 520;

export function BodyScan({ crewId }: { crewId: string }) {
  const t = useT();
  const { frame } = useDisplayFrame(crewId);
  const focusOrgan = useMissionStore((s) => s.focusOrgan);
  const openMetric = useMissionStore((s) => s.openMetric);
  const locale = useMissionStore((s) => s.locale);
  const [pinned, setPinned] = useState<OrganId | null>(null);
  const [hover, setHover] = useState<OrganId | null>(null);
  const root = useRef<SVGSVGElement>(null);
  const active = hover ?? pinned;
  const sex = crewSex(crewId);
  const female = sex === 'F';
  const model = bodyParts(sex);
  /** a canvas point follows the figure's width at its height (the organs and markers sit inside the body) */
  const fit = (p: { x: number; y: number }) => ({ x: 120 + (p.x - 120) * widthFactor(female, (p.y - 25) / 2.4), y: p.y });

  useEffect(() => focusOrgan(active), [active, focusOrgan]);
  useEffect(() => { setPinned(null); }, [crewId]);

  // outline draws itself (Anime.js) when the selected astronaut changes
  useEffect(() => {
    if (!root.current) return;
    const paths = root.current.querySelectorAll('.body-line');
    const a = animate(svg.createDrawable(paths), { draw: ['0 0', '0 1'], duration: 1400, ease: 'inOutQuad', delay: (_el: unknown, i?: number) => (i ?? 0) * 25 });
    return () => void a.pause();
  }, [crewId]);

  const organStatus = (id: OrganId): Status => {
    const o = ORGANS.find((x) => x.id === id)!;
    return worstStatus(o.metrics.map((m) => frame?.status.byMetric[m] ?? 'NOMINAL'));
  };
  const pick = (id: OrganId) => setPinned((p) => (p === id ? null : id));
  const vals: Record<string, number> = frame ? { ...frame.vitals, co2: frame.cabin.co2, o2: frame.cabin.o2 } : {};

  const organFill = (id: OrganId) => {
    const c = STATUS_COLOR[organStatus(id)];
    return { fill: c, fillOpacity: active === id ? 0.5 : 0.16, stroke: c, strokeOpacity: active === id ? 1 : 0.55, strokeWidth: active === id ? 1.6 : 1 };
  };
  const muscleOn = active === 'muscle';
  const muscleColor = STATUS_COLOR[organStatus('muscle')];

  return (
    <section className="card flex h-full min-h-0 flex-col items-center gap-2 p-3.5" aria-label={t('scan.title')}>
      <div className="flex w-full items-center justify-between gap-2">
        <h3 className="text-[13px] font-medium text-muted-foreground">{t('scan.title')}</h3>
        <SexBadge sex={sex} />
      </div>
      <div className="relative mx-auto min-h-0 w-full max-w-[250px] flex-1">
        <svg ref={root} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-full max-h-[560px] w-full" role="group" aria-label={t('scan.title')}>
          <defs>
            <linearGradient id="body-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="scan-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4FB6A8" stopOpacity="0" />
              <stop offset="1" stopColor="#4FB6A8" stopOpacity="0.45" />
            </linearGradient>
            <clipPath id="body-clip">
              <g transform={MODEL_TRANSFORM}>{ALL_PARTS.flatMap((k) => model[k].map((pts) => <polygon key={`${k}${pts}`} points={pts} />))}</g>
            </clipPath>
          </defs>

          {/* silhouette: the anatomy figure, muscle groups as faint plates */}
          <g transform={MODEL_TRANSFORM} fill="url(#body-fill)" stroke="rgba(159,176,201,0.6)" strokeWidth="0.4" strokeLinejoin="round">
            {ALL_PARTS.flatMap((k) => model[k].map((pts) => <polygon key={`${k}${pts}`} className="body-line" points={pts} />))}
          </g>

          {/* muscle groups light up as a whole when selected */}
          <g transform={MODEL_TRANSFORM} fill={muscleColor} fillOpacity={muscleOn ? 0.3 : 0} style={{ transition: 'fill-opacity .25s' }} stroke="none" aria-hidden>
            {MUSCLE_PARTS.flatMap((k) => model[k].map((pts) => <polygon key={`${k}${pts}`} points={pts} />))}
          </g>

          {/* organs, drawn like an x-ray inside the body */}
          <g aria-hidden transform={female ? `${MODEL_TRANSFORM} translate(49.5 0) scale(0.9 1) translate(-49.5 0)` : MODEL_TRANSFORM}>
            <path d={BRAIN} {...organFill('brain')} strokeWidth={organFill('brain').strokeWidth / 2.4} style={{ transition: 'fill-opacity .25s, stroke-opacity .25s' }} />
            <path d="M49.5 3.5 L49.5 15.5" stroke="rgba(255,255,255,0.25)" strokeWidth="0.3" fill="none" />
            <path d={LUNG} {...organFill('lungs')} strokeWidth={organFill('lungs').strokeWidth / 2.4} style={{ transition: 'fill-opacity .25s, stroke-opacity .25s' }} />
            <g transform={MIRROR}><path d={LUNG} {...organFill('lungs')} strokeWidth={organFill('lungs').strokeWidth / 2.4} style={{ transition: 'fill-opacity .25s, stroke-opacity .25s' }} /></g>
            <path d={HEART} {...organFill('heart')} strokeWidth={organFill('heart').strokeWidth / 2.4} style={{ transition: 'fill-opacity .25s, stroke-opacity .25s' }} />
          </g>

          {/* scan line, clipped to the silhouette */}
          <g clipPath="url(#body-clip)" aria-hidden style={{ pointerEvents: 'none' }}>
            <rect className="scanline" x="0" y="0" width={W} height="70" fill="url(#scan-grad)" style={{ transformBox: 'view-box' }} />
          </g>

          {/* interactive markers */}
          {ORGANS.map((o) => {
            const st = organStatus(o.id);
            const c = STATUS_COLOR[st];
            const on = active === o.id;
            return (
              <g
                key={o.id}
                role="button"
                tabIndex={0}
                aria-pressed={pinned === o.id}
                aria-label={`${t(`organ.${o.id}` as DictKey)}: ${statusWord(st)}`}
                className="cursor-pointer outline-none"
                onClick={() => pick(o.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(o.id); } if (e.key === 'Escape') setPinned(null); }}
                onPointerEnter={() => setHover(o.id)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(o.id)}
                onBlur={() => setHover(null)}
              >
                {MARKERS[o.id].map((m0, i) => { const m = fit(m0); return (
                  <g key={i}>
                    <circle cx={m.x} cy={m.y} r="14" fill="transparent" />
                    {st !== 'NOMINAL' && <circle className="halo" cx={m.x} cy={m.y} r="6" fill="none" stroke={c} strokeWidth="1.5" />}
                    <circle
                      cx={m.x} cy={m.y} r={on ? 7 : 5.5} fill={c} stroke="#fff" strokeWidth="1.6"
                      style={{ transition: 'r .2s', filter: on ? `drop-shadow(0 0 6px ${c})` : 'drop-shadow(0 1px 2px rgba(0,0,0,.5))' }}
                    />
                  </g>
                ); })}
              </g>
            );
          })}
        </svg>

        {/* readings of the organ under the pointer / pinned: a popover right next to the marker */}
        {ORGANS.map((o) => {
          const a = { ...POPOVER[o.id], ...fit(POPOVER[o.id]) };
          const st = organStatus(o.id);
          return (
            <Popover key={o.id} open={active === o.id}>
              <PopoverAnchor asChild>
                <span className="pointer-events-none absolute size-1" style={{ left: `${(a.x / W) * 100}%`, top: `${(a.y / H) * 100}%` }} aria-hidden />
              </PopoverAnchor>
              <PopoverContent
                side={a.side}
                align="start"
                className="w-60"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                onPointerDownOutside={() => setPinned(null)}
                onEscapeKeyDown={() => setPinned(null)}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{t(`organ.${o.id}` as DictKey)}</p>
                  <StatusBadge status={st} />
                </div>
                {(() => {
                  const info = organAbout(o.id, locale);
                  return info ? <Tip label={t('about.organ')}><p className="mb-2 text-[11px] leading-snug text-muted-foreground">{info.text}</p></Tip> : null;
                })()}
                <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13px]">
                  {o.metrics.map((m) => (
                    <div key={m} className="contents">
                      <dt className="text-muted-foreground first-letter:uppercase">
                        <Tip label={t('about.open', { name: metricName(m) })}>
                          <button
                            type="button"
                            onClick={() => openMetric(m)}
                            className="cursor-pointer rounded-sm text-left first-letter:uppercase hover:text-bone hover:underline focus-visible:text-bone focus-visible:underline"
                          >
                            {metricName(m)}
                          </button>
                        </Tip>
                      </dt>
                      <dd className="num text-right">{formatValue(m, vals[m]) || '—'}</dd>
                    </div>
                  ))}
                </dl>
                {(() => {
                  // the first action for the organ's worst reading
                  const worst = o.metrics
                    .map((m) => ({ m, s: frame?.status.byMetric[m] ?? ('NOMINAL' as Status) }))
                    .sort((x, y) => STATUS_RANK[y.s] - STATUS_RANK[x.s])[0];
                  return worst && worst.s !== 'NOMINAL' ? <DoNow metric={worst.m} status={worst.s} value={vals[worst.m]} className="mt-2.5" /> : null;
                })()}
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">{t('scan.hint')}</p>
    </section>
  );
}


/** Small badge with the crew member's sex (icon and word), as in a medical record. Nothing when it is not recorded. */
export function SexBadge({ sex, className = '' }: { sex: 'F' | 'M' | undefined; className?: string }) {
  const t = useT();
  if (!sex) return null;
  const Icon = sex === 'F' ? Venus : Mars;
  return (
    <Tip label={t('sex.tip')}>
      <span className={`inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] text-muted-foreground ${className}`}>
        <Icon className="size-3" aria-hidden />
        {t(`sex.${sex}` as DictKey)}
      </span>
    </Tip>
  );
}
