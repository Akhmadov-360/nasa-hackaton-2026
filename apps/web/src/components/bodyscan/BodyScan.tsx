'use client';
import { useEffect, useRef, useState } from 'react';
import { animate, svg } from 'animejs';
import { worstStatus, type Status } from '@astro/engine';
import { useDisplayFrame } from '@/hooks/useDisplayFrame';
import { useT, type DictKey } from '@/lib/i18n';
import { metricLabel, METRICS, ORGANS, STATUS_COLOR, STATUS_WORD } from '@/lib/metrics';
import { useMissionStore } from '@/lib/store/missionStore';

type OrganId = (typeof ORGANS)[number]['id'];

/** Hotspot geometry on a 200 x 420 canvas. Muscle is drawn on both arms and both thighs. */
const SPOTS: Record<OrganId, Array<{ cx: number; cy: number; rx: number; ry: number }>> = {
  brain: [{ cx: 100, cy: 36, rx: 13, ry: 11 }],
  heart: [{ cx: 109, cy: 138, rx: 9, ry: 10 }],
  lungs: [{ cx: 82, cy: 128, rx: 13, ry: 22 }, { cx: 118, cy: 128, rx: 13, ry: 22 }],
  muscle: [
    { cx: 50, cy: 158, rx: 7, ry: 22 }, { cx: 150, cy: 158, rx: 7, ry: 22 },
    { cx: 82, cy: 296, rx: 11, ry: 34 }, { cx: 118, cy: 296, rx: 11, ry: 34 },
  ],
};

function fmt(key: string, v: number | undefined): string {
  const m = METRICS[key];
  if (!m || typeof v !== 'number' || !Number.isFinite(v)) return '—';
  return `${v.toFixed(m.decimals)} ${m.unit}`;
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
    const a = animate(svg.createDrawable(paths), { draw: ['0 0', '0 1'], duration: 1400, ease: 'inOutQuad', delay: (_el: unknown, i?: number) => (i ?? 0) * 60 });
    return () => void a.pause();
  }, [crewId]);

  const organStatus = (id: OrganId): Status => {
    const o = ORGANS.find((x) => x.id === id)!;
    return worstStatus(o.metrics.map((m) => frame?.status.byMetric[m] ?? 'NOMINAL'));
  };

  const pick = (id: OrganId) => setPinned((p) => (p === id ? null : id));

  const vals: Record<string, number> = frame ? { ...frame.vitals, co2: frame.cabin.co2, o2: frame.cabin.o2 } : {};
  const activeOrgan = ORGANS.find((o) => o.id === active);

  return (
    <section className="glass glass-blur flex flex-col items-center gap-3 p-4" aria-label={t('scan.title')}>
      <h3 className="self-start text-sm font-medium text-mist">{t('scan.title')}</h3>
      <div className="relative w-full max-w-[210px]">
        <svg ref={root} viewBox="0 0 200 420" className="w-full" role="group" aria-label={t('scan.title')}>
          <defs>
            <linearGradient id="scan-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4FB6A8" stopOpacity="0" />
              <stop offset="1" stopColor="#4FB6A8" stopOpacity="0.5" />
            </linearGradient>
            <clipPath id="body-clip">
              <circle cx="100" cy="38" r="22" />
              <rect x="86" y="58" width="28" height="22" />
              <path d="M62 84 C80 76 120 76 138 84 L148 150 C150 176 142 206 136 226 L64 226 C58 206 50 176 52 150 Z" />
              <path d="M62 90 L44 150 L36 212 L48 214 L62 160 Z M138 90 L156 150 L164 212 L152 214 L138 160 Z" />
              <path d="M66 224 L134 224 L128 330 L124 410 L108 410 L100 250 L92 410 L76 410 L72 330 Z" />
            </clipPath>
          </defs>
          <g fill="rgba(28,39,64,0.55)" stroke="rgba(159,176,201,0.5)" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
            <circle className="body-line" cx="100" cy="38" r="22" />
            <path className="body-line" d="M92 58 L92 76 M108 58 L108 76" fill="none" />
            <path className="body-line" d="M62 84 C80 76 120 76 138 84 L148 150 C150 176 142 206 136 226 L64 226 C58 206 50 176 52 150 Z" />
            <path className="body-line" d="M62 90 L44 150 L36 212 L48 214 L62 160 Z" />
            <path className="body-line" d="M138 90 L156 150 L164 212 L152 214 L138 160 Z" />
            <path className="body-line" d="M66 224 L100 232 L134 224 L128 330 L124 410 L108 410 L100 250 L92 410 L76 410 L72 330 Z" />
          </g>
          {/* scan line, clipped to the silhouette */}
          <g clipPath="url(#body-clip)" aria-hidden>
            <rect className="scanline" x="0" y="0" width="200" height="60" fill="url(#scan-grad)" style={{ transformBox: 'view-box' }} />
          </g>
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
                aria-label={`${t(`organ.${o.id}` as DictKey)}: ${STATUS_WORD[st]}`}
                className="cursor-pointer outline-none"
                onClick={() => pick(o.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(o.id); } }}
                onPointerEnter={() => setHover(o.id)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(o.id)}
                onBlur={() => setHover(null)}
              >
                {SPOTS[o.id].map((s, i) => (
                  <g key={i}>
                    {st !== 'NOMINAL' && <ellipse className="halo" cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill="none" stroke={c} strokeWidth="1.5" />}
                    <ellipse
                      cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
                      fill={c} fillOpacity={on ? 0.85 : 0.4}
                      stroke={c} strokeWidth={on ? 2 : 1}
                      style={{ filter: on ? `drop-shadow(0 0 7px ${c})` : undefined, transition: 'fill-opacity .25s, stroke-width .25s' }}
                    />
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="grid w-full grid-cols-1 gap-1 text-xs">
        {ORGANS.map((o) => {
          const st = organStatus(o.id);
          return (
            <li key={o.id}>
              <button
                onClick={() => pick(o.id)}
                onPointerEnter={() => setHover(o.id)}
                onPointerLeave={() => setHover(null)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${active === o.id ? 'bg-teal/15' : 'hover:bg-panel-2'}`}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: STATUS_COLOR[st] }} aria-hidden />
                <span className="truncate">{t(`organ.${o.id}` as DictKey)}</span>
                <span className="ml-auto text-[10px] text-mist">{STATUS_WORD[st]}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {/* micro-metrics of the organ under the pointer / pinned: right next to the silhouette */}
      <div className="min-h-[92px] w-full rounded-xl bg-ink/50 p-3" aria-live="polite">
        {activeOrgan ? (
          <>
            <p className="mb-1.5 text-sm font-medium" style={{ color: STATUS_COLOR[organStatus(activeOrgan.id)] }}>
              {t(`organ.${activeOrgan.id}` as DictKey)} · {STATUS_WORD[organStatus(activeOrgan.id)]}
            </p>
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs">
              {activeOrgan.metrics.map((m) => (
                <div key={m} className="contents">
                  <dt className="truncate text-mist">{metricLabel(m)}</dt>
                  <dd className="num text-right">{fmt(m, vals[m])}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="text-xs text-mist">{t('scan.hint')}</p>
        )}
      </div>
    </section>
  );
}
