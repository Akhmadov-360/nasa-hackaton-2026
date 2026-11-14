'use client';
import { ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tip';
import { useCheckins } from '@/hooks/useCheckins';
import { crewName } from '@/lib/engineConfig';
import { useT, type DictKey } from '@/lib/i18n';
import { useMissionStore } from '@/lib/store/missionStore';

/**
 * "N check-ins due": a quiet chip in the header, only while something is due for the selected crew member. It is not
 * an alarm (amber only when one is overdue); pressing it opens the Self-check tab and the entry window at the first
 * one that is due.
 */
export function CheckinChip() {
  const t = useT();
  const due = useCheckins();
  const crewId = useMissionStore((s) => s.selectedCrewId);
  const setView = useMissionStore((s) => s.setTelemetryView);
  const openSelfCheck = useMissionStore((s) => s.openSelfCheck);
  if (due.length === 0) return null;
  const overdue = due.some((c) => c.state === 'overdue');
  const list = due.map((c) => t(`metric.${c.metric}` as DictKey)).join(', ');
  const label = t('checkin.tip', { name: crewName(crewId), list });
  return (
    <Tip label={label} side="bottom">
      <Button
        variant="secondary" size="sm" className="gap-1.5 rounded-full px-3"
        aria-label={label}
        onClick={() => { setView('selfcheck'); openSelfCheck(due[0].metric); }}
      >
        <ClipboardCheck className={overdue ? 'text-amber' : 'text-teal'} aria-hidden />
        <span className="num">{due.length}</span>
        <span className="hidden 2xl:inline">{t('checkin.chip', { n: due.length })}</span>
      </Button>
    </Tip>
  );
}
