import modifiers from '../../data/modifiers.json';
import radiation from '../../data/radiation-model.json';
import thresholds from '../../data/thresholds.json';
import type { EngineConfig } from './frame';
import type { ModifiersConfig, RadiationConfig } from './modifiers';
import type { EngineEvent, ScenarioPack, Thresholds, Track } from './schemas';

const track: Track = {
  ecgHz: 360, vitalsHz: 1,
  ecg: Array.from({ length: 3600 }, (_, i) => Math.sin(i / 20)),
  hr: Array(10).fill(70), spo2: Array(10).fill(98), resp: Array(10).fill(15),
};
export const testPack: ScenarioPack = {
  meta: { id: 't', title: 't', sources: [], licenses: [] },
  crew: [{ id: 'A1', name: 'A', role: 'CDR' }, { id: 'A2', name: 'B', role: 'FE' }],
  baselines: { A1: track, A2: track }, events: [],
};
export const cfgForTests = (log: EngineEvent[]): EngineConfig => ({
  pack: testPack, thresholds: thresholds as Thresholds, modifiers: modifiers as unknown as ModifiersConfig, radiation: radiation as unknown as RadiationConfig, log,
});
