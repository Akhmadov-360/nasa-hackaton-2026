'use client';
import dynamic from 'next/dynamic';

// Client-only: persisted state and canvas make a server render pointless and cause hydration mismatches.
const MissionControl = dynamic(() => import('./MissionControl').then((m) => m.MissionControl), { ssr: false });

export function ClientApp() {
  return <MissionControl />;
}
