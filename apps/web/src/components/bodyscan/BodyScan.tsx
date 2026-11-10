'use client';
import { useEffect, useRef, useState } from 'react';
import { animate, svg } from 'animejs';
import { worstStatus, type Status } from '@astro/engine';
import { StatusBadge } from '@/components/StatusBadge';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useDisplayFrame } from '@/hooks/useDisplayFrame';
import { useT, metricName, statusWord, type DictKey } from '@/lib/i18n';
import { formatValue } from '@/lib/logText';
import { ORGANS, STATUS_COLOR } from '@/lib/metrics';
import { useMissionStore } from '@/lib/store/missionStore';

type OrganId = (typeof ORGANS)[number]['id'];

/* ------------------------------------------------------------------------------------------------
 * Front-view body on a 240 x 520 canvas, drawn by hand as separate anatomical segments (head, neck, torso,
 * arms, thighs, calves, feet) with muscle-group lines and the organs drawn inside like an x-ray.
 * Left-side segments are drawn once and mirrored. Replace the paths here to swap in another model;
 * the organ ids (brain, heart, lungs, muscle) and the marker positions below are what the rest of the app uses.
 * ---------------------------------------------------------------------------------------------- */

const SEGMENTS = {
  torso: 'M78 102 C88 92 102 86 112 84 L128 84 C138 86 152 92 162 102 C168 134 162 176 152 208 C149 226 151 242 153 254 L87 254 C89 242 91 226 88 208 C78 176 72 134 78 102 Z',
};
/** Drawn for the viewer's left side and mirrored for the right. */
const HALF = {
  upperArm: 'M78 102 C64 108 54 128 50 160 L47 180 C53 184 63 185 69 182 L76 152 C80 136 84 120 84 106 Z',
  forearm: 'M47 180 C43 204 37 230 31 254 L46 260 C53 234 63 208 69 182 Z',
  hand: 'M31 254 C27 268 29 282 37 290 C45 294 52 282 53 268 L46 260 Z',
  thigh: 'M88 254 C82 294 80 338 86 376 L110 376 C114 338 118 296 120 262 L120 254 Z',
  calf: 'M86 376 C84 406 86 438 91 466 L104 466 C108 438 111 406 110 376 Z',
  foot: 'M91 466 L89 496 C86 506 87 512 97 512 L112 512 C114 506 107 500 104 496 L104 466 Z',
};
/** Muscle-group and joint detail lines (viewer's left side). */
const DETAIL_HALF = [
  'M120 96 C108 100 96 108 90 124 C96 134 110 136 120 130', // pectoral
  'M92 160 C96 190 98 214 96 236', // oblique
  'M99 270 C97 310 98 340 100 366', // quadriceps
  'M97 382 C96 410 98 440 99 462', // calf
  'M52 150 C56 160 60 170 62 180', // biceps
  'M92 372 C98 378 106 378 110 372', // knee
];
const DETAIL_CENTER = [
  'M120 90 L120 236', // linea alba
  'M108 152 L132 152', 'M107 172 L133 172', 'M108 192 L132 192', 'M109 212 L131 212', // abdominals
  'M110 64 L110 86', 'M130 64 L130 86', // neck
];
const BRAIN = 'M104 40 C101 28 111 20 120 25 C129 20 139 28 136 40 C138 49 129 55 120 52 C111 55 102 49 104 40 Z';
const LUNG = 'M98 104 C88 112 86 142 90 166 C95 176 112 172 117 162 L117 112 C113 104 104 100 98 104 Z';
const HEART = 'M134 164 C122 154 114 146 116 136 C118 128 128 126 134 134 C140 126 150 128 152 136 C154 146 146 154 134 164 Z';

const MIRROR = 'translate(240 0) scale(-1 1)';

/** Marker (dot) positions in canvas units, with the popover side for each organ. */
const MARKERS: Record<OrganId, Array<{ x: number; y: number }>> = {
  brain: [{ x: 120, y: 38 }],
  heart: [{ x: 134, y: 147 }],
  lungs: [{ x: 102, y: 128 }, { x: 138, y: 118 }],
  muscle: [{ x: 61, y: 150 }, { x: 179, y: 150 }, { x: 99, y: 312 }, { x: 141, y: 312 }],
};
const POPOVER: Record<OrganId, { x: number; y: number; side: 'left' | 'right' }> = {
  brain: { x: 120, y: 38, side: 'right' },
  heart: { x: 134, y: 147, side: 'right' },
  lungs: { x: 102, y: 128, side: 'left' },
  muscle: { x: 99, y: 312, side: 'right' },
};
const W = 240;
const H = 520;

function Half() {
  return (
    <>
      {Object.entries(HALF).map(([k, d]) => <path key={k} className="body-line" d={d} />)}
      {DETAIL_HALF.map((d) => <path key={d} className="body-line" d={d} fill="none" strokeOpacity={0.5} />)}
    </>
  );
}

export function BodyScan({ crewId }: { crewId: string }) {
  const t = useT();
  const { frame } = useDisplayFrame(crewId);
  const focusOrgan = useMissionStore((s) => s.focusOrgan);
  const [pinned, setPinned] = useState<OrganId | null>(null);
  const [hover, setHover] = useState<OrganId | null>(null);
  const root = useRef<SVGSVGElement>(null);
  const active = hover ?? pinned;

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
      <h3 className="self-start text-[13px] font-medium text-muted-foreground">{t('scan.title')}</h3>
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
              <ellipse cx="120" cy="40" rx="22" ry="28" />
              <path d={SEGMENTS.torso} />
              {Object.values(HALF).map((d, i) => <path key={i} d={d} />)}
              <g transform={MIRROR}>{Object.values(HALF).map((d, i) => <path key={i} d={d} />)}</g>
            </clipPath>
          </defs>

          {/* silhouette */}
          <g fill="url(#body-fill)" stroke="rgba(159,176,201,0.6)" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
            <ellipse className="body-line" cx="120" cy="40" rx="22" ry="28" />
            <path className="body-line" d={SEGMENTS.torso} />
            <Half />
            <g transform={MIRROR}><Half /></g>
            {DETAIL_CENTER.map((d) => <path key={d} className="body-line" d={d} fill="none" strokeOpacity={0.4} />)}
          </g>

          {/* muscle groups light up as a whole when selected */}
          <g fill={muscleColor} fillOpacity={muscleOn ? 0.28 : 0} style={{ transition: 'fill-opacity .25s' }} stroke="none" aria-hidden>
            {[HALF.upperArm, HALF.thigh, HALF.calf].map((d) => <path key={d} d={d} />)}
            <g transform={MIRROR}>{[HALF.upperArm, HALF.thigh, HALF.calf].map((d) => <path key={d} d={d} />)}</g>
          </g>

          {/* organs, drawn like an x-ray inside the body */}
          <g aria-hidden>
            <path d={BRAIN} {...organFill('brain')} style={{ transition: 'fill-opacity .25s, stroke-opacity .25s' }} />
            <path d="M120 25 L120 52" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" fill="none" />
            <path d={LUNG} {...organFill('lungs')} style={{ transition: 'fill-opacity .25s, stroke-opacity .25s' }} />
            <g transform={MIRROR}><path d={LUNG} {...organFill('lungs')} style={{ transition: 'fill-opacity .25s, stroke-opacity .25s' }} /></g>
            <path d={HEART} {...organFill('heart')} style={{ transition: 'fill-opacity .25s, stroke-opacity .25s' }} />
          </g>

          {/* scan line, clipped to the silhouette */}
          <g clipPath="url(#body-clip)" aria-hidden>
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
                {MARKERS[o.id].map((m, i) => (
                  <g key={i}>
                    <circle cx={m.x} cy={m.y} r="14" fill="transparent" />
                    {st !== 'NOMINAL' && <circle className="halo" cx={m.x} cy={m.y} r="6" fill="none" stroke={c} strokeWidth="1.5" />}
                    <circle
                      cx={m.x} cy={m.y} r={on ? 7 : 5.5} fill={c} stroke="#fff" strokeWidth="1.6"
                      style={{ transition: 'r .2s', filter: on ? `drop-shadow(0 0 6px ${c})` : 'drop-shadow(0 1px 2px rgba(0,0,0,.5))' }}
                    />
                  </g>
                ))}
              </g>
            );
          })}
        </svg>

        {/* readings of the organ under the pointer / pinned: a popover right next to the marker */}
        {ORGANS.map((o) => {
          const a = POPOVER[o.id];
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
                <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13px]">
                  {o.metrics.map((m) => (
                    <div key={m} className="contents">
                      <dt className="text-muted-foreground first-letter:uppercase">{metricName(m)}</dt>
                      <dd className="num text-right">{formatValue(m, vals[m]) || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">{t('scan.hint')}</p>
    </section>
  );
}
