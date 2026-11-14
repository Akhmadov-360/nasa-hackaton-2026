/** The mission contexts of missions.json. No imports from the store or the dictionary, so the store can use it without a cycle. */
import raw from '@astro/data/missions.json';

export interface Text { en: string; ru?: string; uz?: string }
export interface MissionContext {
  id: string;
  /** gravity where the crew is, in g */
  gravityG: number;
  /** one-way signal delay [min, max], seconds */
  delaySec: [number, number];
  /** live: a ground reply arrives within seconds; delayed: the crew must act first */
  reply: 'live' | 'delayed';
  label: Text;
  place: Text;
}

const data = raw as unknown as { provisional?: boolean; contexts: MissionContext[] };
export const missions: MissionContext[] = data.contexts;
export const DEFAULT_MISSION = missions[0].id;
export const isMissionId = (id: unknown): id is string => typeof id === 'string' && missions.some((m) => m.id === id);
export const missionOf = (id: string): MissionContext => missions.find((m) => m.id === id) ?? missions[0];
