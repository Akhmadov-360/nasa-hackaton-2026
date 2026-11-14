import type { ModifiersConfig, RadiationConfig, ScenarioPack, Thresholds } from '@astro/engine';
import pack from '@astro/data/packs/demo.pack.json';
import thresholds from '@astro/data/thresholds.json';
import modifiers from '@astro/data/modifiers.json';
import radiation from '@astro/data/radiation-model.json';

export const baseCfg = {
  pack: pack as unknown as ScenarioPack,
  thresholds: thresholds as unknown as Thresholds,
  modifiers: modifiers as unknown as ModifiersConfig,
  radiation: radiation as unknown as RadiationConfig,
};

export const crew = baseCfg.pack.crew;
export const crewName = (id: string) => crew.find((c) => c.id === id)?.name ?? id;
export const crewSex = (id: string) => crew.find((c) => c.id === id)?.sex;
export const crewIndex = (id: string) => crew.findIndex((c) => c.id === id) + 1;
export const isProvisional = !!baseCfg.thresholds.provisional;
