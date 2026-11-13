'use client';
import { ListChecks, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SpringCheck from '@/components/SpringCheck';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { crewName } from '@/lib/engineConfig';
import { useT } from '@/lib/i18n';
import { formatMet } from '@/lib/metrics';
import { getProtocol } from '@/lib/protocols';
import { useMissionStore } from '@/lib/store/missionStore';

/** Step-by-step response checklist for an alert or an incident. Ticks are kept while the session runs. */
export function ProtocolDialog() {
  const t = useT();
  const view = useMissionStore((s) => s.protocolView);
  const locale = useMissionStore((s) => s.locale);
  const checks = useMissionStore((s) => s.checks);
  const toggle = useMissionStore((s) => s.toggleCheck);
  const clear = useMissionStore((s) => s.clearChecks);
  const close = useMissionStore((s) => s.closeProtocol);
  const protocol = view ? getProtocol(view.protocolId, locale) : null;
  const done = view && protocol ? protocol.steps.filter((_, i) => checks[`${view.key}:${i}`]).length : 0;
  const total = protocol?.steps.length ?? 0;

  return (
    <Dialog open={!!view} onOpenChange={(o) => !o && close()}>
      <DialogContent closeLabel={t('protocol.close')} aria-describedby="protocol-note">
        {view && protocol && (
          <>
            <div className="flex items-start gap-3 pr-10">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary"><ListChecks className="size-5" aria-hidden /></span>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t('protocol.title')}</p>
                <DialogTitle>{protocol.title}</DialogTitle>
                <DialogDescription className="num mt-0.5">
                  {t('protocol.for', { crew: view.crewId ? crewName(view.crewId) : '—', t: view.t !== undefined ? formatMet(view.t) : '—' })}
                </DialogDescription>
              </div>
            </div>

            <p id="protocol-note" className="mt-4 flex items-start gap-2 rounded-2xl bg-amber/10 px-3.5 py-2.5 text-sm text-amber">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {t('protocol.illustrative')}
            </p>

            <div className="mt-5" role="group" aria-label={protocol.title}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('protocol.progress', { done, total })}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
              </div>
              <ol className="mt-3">
                {protocol.steps.map((step, i) => {
                  const key = `${view.key}:${i}`;
                  const on = !!checks[key];
                  return (
                    <li key={key}>
                      {i > 0 && <Separator />}
                      <SpringCheck
                        checked={on} onChange={() => toggle(key)} ariaLabel={step}
                        label={<><span className="num mr-2 text-muted-foreground">{i + 1}.</span>{step}</>}
                        color="#e8eefc" fillColor="#4FB6A8" checkColor="#0b1220" boxSize={22} boxRadius={7} fontSize={15} doneOpacity={0.55}
                        className="w-full py-3.5"
                      />
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={() => clear(`${view.key}:`)} disabled={!done}>{t('protocol.clear')}</Button>
              <Button onClick={close}>{t('protocol.close')}</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
