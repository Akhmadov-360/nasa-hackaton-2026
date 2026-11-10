'use client';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
import { Toaster } from 'sileo';
import { BodyScan } from '@/components/bodyscan/BodyScan';
import { CrewRail } from '@/components/crew/CrewRail';
import { ControlDeck } from '@/components/deck/ControlDeck';
import { EnterMissionControl } from '@/components/EnterMissionControl';
import { GooeyFilter } from '@/components/GooeyFilter';
import { TelemetryGrid } from '@/components/telemetry/TelemetryGrid';
import { TimeTravelBar } from '@/components/time/TimeTravelBar';
import { TopBar } from '@/components/topbar/TopBar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WidgetBoundary } from '@/components/WidgetBoundary';
import { crew } from '@/lib/engineConfig';
import { globalStatus, useMissionStore } from '@/lib/store/missionStore';

function Aurora() {
  const status = globalStatus(useMissionStore((s) => s.latest));
  const level = status === 'NOMINAL' ? 'nominal' : status === 'CAUTION' ? 'caution' : 'critical';
  return (
    <div className="aurora" aria-hidden data-mission-status={status}>
      <i className="nominal" data-on={level === 'nominal'} />
      <i className="caution" data-on={level === 'caution'} />
      <i className="critical" data-on={level === 'critical'} />
    </div>
  );
}

/** 1-4 select a crew member, T returns to live, M mutes. Ignored while typing or with modifier keys. */
function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || el?.closest('input, textarea, [contenteditable]')) return;
      const s = useMissionStore.getState();
      if (!s.entered) return;
      const n = Number(e.key);
      if (n >= 1 && n <= crew.length) s.selectCrew(crew[n - 1].id);
      else if (e.key.toLowerCase() === 't') s.setTimeTravel(null);
      else if (e.key.toLowerCase() === 'm') s.setSound(!s.soundOn);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function MissionControl() {
  const [qc] = useState(() => new QueryClient());
  const entered = useMissionStore((s) => s.entered);
  const crewId = useMissionStore((s) => s.selectedCrewId);
  useShortcuts();

  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <GooeyFilter />
        <Aurora />
        <Toaster
          position="top-center"
          theme="dark"
          offset={{ top: 62 }}
          options={{
            fill: '#1C2740',
            styles: { title: 'text-bone! font-semibold!', description: 'text-bone/85! text-sm!' },
          }}
        />
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-popover focus:px-3 focus:py-2">
          Skip to telemetry
        </a>
        <div className="mx-auto flex min-h-dvh max-w-[1720px] flex-col gap-3 p-3 lg:h-dvh">
          <TopBar />
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[96px_minmax(0,1fr)_300px]">
            <CrewRail />
            <main id="main" tabIndex={-1} className="thin-scroll min-h-0 outline-none lg:overflow-y-auto lg:pr-1">
              <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] lg:min-h-full">
                <div className="min-h-[420px] md:sticky md:top-0 md:self-start md:h-[calc(100dvh-210px)] md:max-h-[640px]">
                  <WidgetBoundary name="Body scan" className="h-full"><BodyScan crewId={crewId} /></WidgetBoundary>
                </div>
                <TelemetryGrid crewId={crewId} />
              </div>
            </main>
            <ControlDeck />
          </div>
          <WidgetBoundary name="Time travel"><TimeTravelBar /></WidgetBoundary>
        </div>
        <AnimatePresence>{!entered && <EnterMissionControl key="enter" />}</AnimatePresence>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
