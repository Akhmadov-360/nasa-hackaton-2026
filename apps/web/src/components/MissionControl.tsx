'use client';
import { useState } from 'react';
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
import { WidgetBoundary } from '@/components/WidgetBoundary';
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

export function MissionControl() {
  const [qc] = useState(() => new QueryClient());
  const entered = useMissionStore((s) => s.entered);
  const crewId = useMissionStore((s) => s.selectedCrewId);

  return (
    <QueryClientProvider client={qc}>
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
      <div className="mx-auto flex min-h-dvh max-w-[1720px] flex-col gap-3 p-3 lg:h-dvh">
        <TopBar />
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[108px_minmax(0,1fr)_320px]">
          <CrewRail />
          <main className="thin-scroll min-h-0 lg:overflow-y-auto lg:pr-1">
            <div className="grid gap-3 xl:grid-cols-[230px_minmax(0,1fr)]">
              <WidgetBoundary name="Body scan"><BodyScan crewId={crewId} /></WidgetBoundary>
              <TelemetryGrid crewId={crewId} />
            </div>
          </main>
          <ControlDeck />
        </div>
        <WidgetBoundary name="Time travel"><TimeTravelBar /></WidgetBoundary>
      </div>
      <AnimatePresence>{!entered && <EnterMissionControl key="enter" />}</AnimatePresence>
    </QueryClientProvider>
  );
}
