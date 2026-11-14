'use client';
import { useMemo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { manualEntries, type ManualEntry } from '@astro/engine';
import { Button } from '@/components/ui/button';
import { useT, type DictKey } from '@/lib/i18n';
import { formatValue } from '@/lib/logText';
import { useMissionStore } from '@/lib/store/missionStore';
import { useSelfCheck } from './context';
import { moodFace } from './mood';
import { ageText } from './SelfCheckView';
import { formatMetShort } from './time';

const DAY = 24 * 3600;

function Row({ entry, live }: { entry: ManualEntry; live: number }) {
  const t = useT();
  const { editing, startEdit, remove } = useSelfCheck();
  const label = t(`metric.${entry.metric}` as DictKey);
  const face = entry.metric === 'mood' ? moodFace(entry.value) : null;
  const beingEdited = !!entry.id && editing?.id === entry.id;
  return (
    <li className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-white/5" style={beingEdited ? { background: 'color-mix(in srgb, var(--color-amber) 12%, transparent)' } : undefined}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">{label}</span>
          {face && <face.Icon className="size-4" style={{ color: face.color }} aria-hidden />}
          <span className="num font-medium">{entry.metric === 'mood' ? t(`selfcheck.mood.${entry.value}` as DictKey) : formatValue(entry.metric, entry.value)}</span>
        </p>
        <p className="num text-[11px] text-muted-foreground">{formatMetShort(entry.t)} · {ageText(live - entry.t, t)}</p>
      </div>
      {entry.id && (
        <div className="flex shrink-0 gap-0.5">
          <Button type="button" variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => startEdit(entry)} aria-label={`${t('selfcheck.edit')}: ${label}`} title={t('selfcheck.edit')}><Pencil /></Button>
          <Button type="button" variant="ghost" size="icon" className="size-9 rounded-full hover:text-coral" onClick={() => remove(entry)} aria-label={`${t('selfcheck.delete')}: ${label}`} title={t('selfcheck.delete')}><Trash2 /></Button>
        </div>
      )}
    </li>
  );
}

/** What was entered in the last 24 hours for the selected crew member, newest first, each with Edit and Remove. */
export function EntryList() {
  const t = useT();
  const { crewId } = useSelfCheck();
  const events = useMissionStore((s) => s.events);
  const live = useMissionStore((s) => s.t);
  const entries = useMemo(() => manualEntries(events, { crewId, fromT: live - DAY, toT: live }).reverse(), [events, crewId, live]);
  return (
    <section aria-labelledby="sc-entries" className="flex flex-col gap-1.5">
      <h3 id="sc-entries" className="text-sm font-medium">{t('selfcheck.entries')}</h3>
      {entries.length === 0 ? (
        <p className="rounded-2xl bg-cell px-3.5 py-3 text-xs leading-snug text-muted-foreground">{t('selfcheck.entries.empty')}</p>
      ) : (
        <ul className="flex flex-col rounded-2xl bg-cell p-1">
          {entries.map((e) => <Row key={e.id ?? `${e.metric}-${e.t}-${e.value}`} entry={e} live={live} />)}
        </ul>
      )}
    </section>
  );
}
