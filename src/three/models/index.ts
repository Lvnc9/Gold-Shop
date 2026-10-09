import type { ModelKind } from '../../domain/types';
import { bar, coinPendant, round } from './bullion';
import { cuban, herringbone, rope } from './chains';
import { bangle, hoops, tennis } from './jewels';
import type { BuildOptions, Kit } from './kit';
import { eternity, signet, solitaire } from './rings';

export type { Kit, BuildOptions };

export const MODELS: Record<ModelKind, (o: BuildOptions) => Kit> = {
  solitaire,
  signet,
  eternity,
  cuban,
  rope,
  herringbone,
  bangle,
  tennis,
  hoops,
  'coin-pendant': coinPendant,
  bar,
  round,
};

/** Which config fields force a geometry rebuild (vs. a cheap material/engraving swap). */
export function geometryKey(model: ModelKind, variant: number, karat: number): string {
  return model === 'round' ? `${model}|${variant}|${karat}` : `${model}|${variant}`;
}
