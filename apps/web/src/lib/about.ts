import raw from '@astro/data/about.json';
import type { DictKey } from './i18n';
import type { Locale } from './store/missionStore';

interface Text { en: string; ru?: string; uz?: string }
export type Hazard = 'radiation' | 'isolation' | 'distance' | 'gravity' | 'closed';
export interface AboutEntry {
  hazards: Hazard[];
  risks: string[];
  why: Text;
  inSpace: Text;
  how: Text;
  redFlags: Text;
  /** everyday habits that keep the reading healthy (prevention, general advice) */
  keepWell: Text;
}
interface OrganAbout extends Text { hazards: Hazard[] }

const data = raw as unknown as {
  provisional?: boolean;
  riskUrl: string;
  hazardUrl: string;
  metrics: Record<string, AboutEntry>;
  organs: Record<string, OrganAbout>;
};

export const aboutProvisional = !!data.provisional;
export const RISK_URL = data.riskUrl;
export const HAZARD_URL = data.hazardUrl;
export const aboutKeys = Object.keys(data.metrics);
export const organAboutKeys = Object.keys(data.organs);

/** Systolic and diastolic share one entry. */
const ALIAS: Record<string, string> = { bpSys: 'bp', bpDia: 'bp' };
export const aboutKeyOf = (metric: string) => ALIAS[metric] ?? metric;

/** Uzbek falls back to Russian (like the voice and the guidance), then to English. */
export const pickText = (t: Text, locale: Locale) => t[locale] ?? (locale === 'uz' ? t.ru : undefined) ?? t.en;

export const aboutFor = (metric: string): AboutEntry | undefined => data.metrics[aboutKeyOf(metric)];

/** Title key of an indicator (the radiation readings have their own labels). */
const TITLE: Record<string, DictKey> = { doseRate: 'rad.rate', dose: 'rad.crewDose' };
export const aboutTitleKey = (key: string): DictKey => TITLE[key] ?? (`metric.${key}` as DictKey);

/** Hazard -> indicator keys (about.json keys), in file order: the legend of the five hazards. */
export function hazardIndex(): Record<Hazard, string[]> {
  const out: Record<Hazard, string[]> = { radiation: [], isolation: [], distance: [], gravity: [], closed: [] };
  for (const [key, entry] of Object.entries(data.metrics)) for (const h of entry.hazards) out[h].push(key);
  return out;
}

export function organAbout(organ: string, locale: Locale): { text: string; hazards: Hazard[] } | undefined {
  const o = data.organs[organ];
  return o ? { text: pickText(o, locale), hazards: o.hazards } : undefined;
}
