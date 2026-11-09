'use client';
import { useEffect, useState } from 'react';
import { Orbit, Radio, WifiOff } from 'lucide-react';
import { SIGNAL_LOST_BANNER } from '@/lib/constants';
import { isProvisional } from '@/lib/engineConfig';
import { useT } from '@/lib/i18n';
import { formatMet, STATUS_COLOR } from '@/lib/metrics';
import { globalStatus, useMissionStore, type Locale } from '@/lib/store/missionStore';
import { IslandPill } from './IslandPill';

function LinkReadout() {
  const t = useT();
  const mode = useMissionStore((s) => s.mode);
  const last = useMissionStore((s) => s.lastFrameAt);
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);
  const age = last ? Math.max(0, Date.now() - last) : null;
  const good = mode === 'LIVE';
  const Icon = good ? Radio : WifiOff;
  return (
    <div className="flex items-center gap-2 text-sm" title={`${t('top.age')}: ${age ?? '—'} ms`}>
      <Icon className="size-4" style={{ color: good ? STATUS_COLOR.NOMINAL : STATUS_COLOR.CAUTION }} aria-hidden />
      <span className="text-mist">{t('top.link')}</span>
      <span className="num font-medium">{t(`mode.${mode}` as const)}</span>
      <span className="num hidden text-xs text-mist lg:inline">{age === null ? '' : `${age < 1000 ? age : '>999'} ms`}</span>
    </div>
  );
}

export function TopBar() {
  const t = useT();
  const met = useMissionStore((s) => s.t);
  const latest = useMissionStore((s) => s.latest);
  const mode = useMissionStore((s) => s.mode);
  const locale = useMissionStore((s) => s.locale);
  const setLocale = useMissionStore((s) => s.setLocale);
  const status = globalStatus(latest);

  return (
    <header className="relative">
      <div className="glass grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 md:grid-cols-[1fr_minmax(0,460px)_1fr]">
        <div className="flex min-w-0 items-center gap-3">
          <Orbit className="size-6 shrink-0 text-teal" aria-hidden />
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-sm font-semibold">{t('app.title')}</h1>
            <p className="num text-xs text-mist">
              {t('top.met')} <span className="text-bone">{formatMet(met)}</span>
            </p>
          </div>
        </div>
        <div className="hidden md:block"><IslandPill /></div>
        <div className="flex items-center justify-end gap-4">
          <LinkReadout />
          <div className="hidden items-center gap-1 sm:flex" role="group" aria-label="Language">
            {(['en', 'ru', 'uz'] as Locale[]).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                aria-pressed={locale === l}
                className={`rounded-md px-2 py-1 text-xs uppercase ${locale === l ? 'bg-teal/20 text-teal' : 'text-mist hover:text-bone'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-semibold md:hidden" style={{ color: STATUS_COLOR[status], background: `color-mix(in srgb, ${STATUS_COLOR[status]} 14%, transparent)` }}>
            {t(`status.${status}` as const)}
          </span>
        </div>
      </div>
      {isProvisional && (
        <p className="num mt-1.5 px-2 text-center text-[11px] text-amber/90">{t('badge.provisional')}</p>
      )}
      {(mode === 'SIM' || mode === 'STALE') && (
        <p role="alert" className="mx-auto mt-2 w-fit rounded-full bg-amber/15 px-4 py-1 text-xs font-medium text-amber">
          {mode === 'SIM' ? SIGNAL_LOST_BANNER : 'ACQUIRING SIGNAL — LAST KNOWN VALUES'}
        </p>
      )}
      <div className="mt-2 md:hidden"><IslandPill /></div>
    </header>
  );
}
