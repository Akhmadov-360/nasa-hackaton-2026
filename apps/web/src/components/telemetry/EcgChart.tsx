'use client';
import { useEffect, useMemo, useRef } from 'react';
import { animate } from 'animejs';
import { HeartPulse } from 'lucide-react';
import { computeFrame } from '@astro/engine';
import { StatusBadge } from '@/components/StatusBadge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ProvenanceMark } from './VitalCard';
import { useDisplayFrame, historyConfig } from '@/hooks/useDisplayFrame';
import { useT } from '@/lib/i18n';
import { useMissionStore } from '@/lib/store/missionStore';
import { ecgRings } from '@/lib/telemetryBus';

const WINDOW_SEC = 4;
/** The trace is always red, like a bedside monitor; the status badge carries the health state. */
const ECG_RED = '#FF4D4F';
const ECG_HZ = 360;

/** Static 4 s ECG reconstructed for the Time Travel moment. */
function historyEcg(crewId: string, t: number, events: ReturnType<typeof useMissionStore.getState>['events']): Float32Array {
  const cfg = historyConfig(events);
  const out: number[] = [];
  for (let k = 0; k < WINDOW_SEC * 10; k++) out.push(...computeFrame(cfg, crewId, t - WINDOW_SEC + k * 0.1).ecg);
  return Float32Array.from(out);
}

export function EcgChart({ crewId }: { crewId: string }) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { frame, replay } = useDisplayFrame(crewId);
  const tt = useMissionStore((s) => s.timeTravelT);
  const events = useMissionStore((s) => s.events);
  const status = frame?.status.overall ?? 'NOMINAL';
  const colorRef = useRef(ECG_RED);
  colorRef.current = ECG_RED;
  const replaySamples = useMemo(() => (tt === null ? null : historyEcg(crewId, tt, events)), [tt, crewId, events]);
  const replayRef = useRef<Float32Array | null>(null);
  replayRef.current = replaySamples;
  const reveal = useRef({ v: 0 });

  // trace-in animation (Anime.js) whenever the selected crew member changes
  useEffect(() => {
    reveal.current.v = 0;
    const a = animate(reveal.current, { v: 1, duration: 800, ease: 'outCubic' });
    return () => void a.pause();
  }, [crewId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let lo = -0.5;
    let hi = 1.5;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      // faint grid
      ctx.strokeStyle = 'rgba(159,176,201,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += w / 16) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 0; y <= h; y += h / 4) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();

      const data = replayRef.current ?? ecgRings[crewId].read();
      const n = Math.min(data.length, WINDOW_SEC * ECG_HZ);
      if (n < 8) return;
      const from = data.length - n;
      let mn = Infinity;
      let mx = -Infinity;
      for (let i = from; i < data.length; i++) { const v = data[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
      // robust range: ignore the extreme 1% so one noisy sample cannot flatten the trace
      const sorted = Array.from(data.subarray(from)).sort((a, b) => a - b);
      const rlo = sorted[Math.floor(sorted.length * 0.01)];
      const rhi = sorted[Math.floor(sorted.length * 0.995)];
      const pad = Math.max(0.1, (rhi - rlo) * 0.08);
      lo += (rlo - pad - lo) * 0.1;
      hi += (rhi + pad - hi) * 0.1;
      const span = Math.max(0.5, hi - lo);
      const xs = w / (WINDOW_SEC * ECG_HZ);
      const xOff = w - n * xs; // newest sample at the right edge
      const revealX = w * reveal.current.v;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, revealX, h);
      ctx.clip();
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = xOff + i * xs;
        const y = h - ((data[from + i] - lo) / span) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      // cheap glow: a wide translucent stroke under the sharp one (shadowBlur is slow without a GPU)
      ctx.strokeStyle = colorRef.current;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [crewId]);

  return (
    <section className="card relative overflow-hidden p-3.5" aria-label={t('ecg.title')}>
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <HeartPulse className="size-4 text-teal" aria-hidden /> {t('ecg.title')}
          {replay && <span className="rounded-full bg-amber/15 px-2 py-0.5 text-xs text-amber">{t('tt.replay')}</span>}
          {frame?.exercise && (
            <Tooltip>
              <TooltipTrigger asChild><span tabIndex={0} className="cursor-help rounded-full bg-teal/15 px-2 py-0.5 text-xs text-teal">{t('state.exercise')}</span></TooltipTrigger>
              <TooltipContent>{t('state.exercise.hint')}</TooltipContent>
            </Tooltip>
          )}
        </h3>
        <span className="flex items-center"><StatusBadge status={status} /><ProvenanceMark sourceKey="hr" limitKey="hr" /></span>
      </header>
      <canvas ref={canvasRef} className="h-24 w-full [@media(max-height:820px)]:h-20" role="img" aria-label={t('ecg.title')} />
    </section>
  );
}
