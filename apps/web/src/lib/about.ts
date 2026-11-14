import raw from '@astro/data/about.json';
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

export function organAbout(organ: string, locale: Locale): { text: string; hazards: Hazard[] } | undefined {
  const o = data.organs[organ];
  return o ? { text: pickText(o, locale), hazards: o.hazards } : undefined;
}
