import raw from '@astro/data/protocols.json';
import type { Locale } from './store/missionStore';

interface Text { en: string; ru?: string; uz?: string }
interface ProtocolDef { title: Text; steps: Text[] }
const protocols = (raw as unknown as { protocols: Record<string, ProtocolDef> }).protocols;
export const protocolsProvisional = !!(raw as { provisional?: boolean }).provisional;

const pick = (t: Text, locale: Locale) => t[locale] ?? t.en;

/** Illustrative response protocol in the interface language (falls back to English, then to the general one). */
export function getProtocol(id: string, locale: Locale): { title: string; steps: string[] } {
  const p = protocols[id] ?? protocols.general;
  return { title: pick(p.title, locale), steps: p.steps.map((s) => pick(s, locale)) };
}
