'use client';
import { motion } from 'motion/react';
import { Orbit } from 'lucide-react';
import { useFlares } from '@/lib/flares';
import { useT } from '@/lib/i18n';
import { startRuntime } from '@/lib/runtime';

/** First screen. The click is the user gesture browsers require before sound and speech may start. */
export function EnterMissionControl() {
  const t = useT();
  const hasFlares = useFlares().length > 0;
  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/85 p-6 backdrop-blur-xl"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-md text-center">
        <Orbit className="mx-auto size-10 text-teal" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">{t('enter.sub')}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t('app.title')}</h1>
        <button
          autoFocus
          onClick={startRuntime}
          className="mt-8 rounded-2xl bg-teal/15 px-7 py-3.5 text-base font-medium text-teal shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-colors duration-200 hover:bg-teal/25 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('enter.cta')}
        </button>
        <p className="mt-4 text-sm text-mist">{t('enter.note')}</p>
        <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
          PhysioNet BIDMC &amp; MIT-BIH{hasFlares ? ' · NASA DONKI' : ''} · NASA Space Apps Challenge, Tashkent 2026
        </p>
      </div>
    </motion.div>
  );
}
