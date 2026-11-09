'use client';

/** Last line of defence: anything that escapes the per-widget boundaries lands here. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid h-dvh place-items-center p-6 text-center">
      <div className="glass max-w-md p-8">
        <h1 className="text-xl font-semibold">Mission Control restarted its display</h1>
        <p className="mt-2 text-mist">The telemetry service is unaffected. Reload the display to continue.</p>
        <button onClick={reset} className="mt-5 rounded-xl bg-teal/20 px-5 py-2.5 font-medium text-teal hover:bg-teal/30">
          Reload display
        </button>
      </div>
    </main>
  );
}
