export type Category = 'rings' | 'necklaces' | 'bracelets' | 'earrings' | 'bullion';
export type MetalColor = 'yellow' | 'rose' | 'white';
export type Karat = 24 | 22 | 18 | 14;
export type Finish = 'polished' | 'satin' | 'hammered';

/** Procedural model factories in src/three/models. */
export type ModelKind =
  | 'solitaire'
  | 'signet'
  | 'eternity'
  | 'cuban'
  | 'rope'
  | 'herringbone'
  | 'bangle'
  | 'tennis'
  | 'hoops'
  | 'coin-pendant'
  | 'bar'
  | 'round';

export interface Variant {
  /** Shown in the configurator, e.g. "4 mm" or "1 oz". */
  label: string;
  /** Gold weight in grams at the base size/length. */
  grams: number;
  /** Human dimensions for the spec table. */
  dims: string;
  /** 0..1 thickness hint passed to the model factory. */
  scale: number;
}

export interface SizeOption {
  kind: 'ring' | 'length' | 'wrist';
  label: string;
  options: string[];
  default: string;
  /** Size at which Variant.grams is measured. */
  base: string;
}

export interface Product {
  slug: string;
  name: string;
  category: Category;
  model: ModelKind;
  tagline: string;
  story: string;
  colors: MetalColor[];
  karats: Karat[];
  variants: Variant[];
  sizes?: SizeOption;
  finishes: Finish[];
  engraving?: { maxChars: number; where: string };
  /** Labour: percentage of metal value, or flat USD. Bullion uses `premium` instead. */
  making?: { type: 'pct' | 'flat'; value: number };
  /** Bullion premium over metal value, as a fraction. */
  premium?: number;
  /** Stones, USD, flat. */
  stones?: { label: string; price: number };
  leadTime: string;
  featured?: boolean;
  defaults: Config;
}

export interface Config {
  color: MetalColor;
  karat: Karat;
  variant: number;
  size?: string;
  finish: Finish;
  engraving: string;
}

export interface PriceBreakdown {
  grams: number;
  pureGrams: number;
  metal: number;
  making: number;
  stones: number;
  engraving: number;
  total: number;
}

export interface CartLine {
  id: string;
  slug: string;
  config: Config;
  qty: number;
}
