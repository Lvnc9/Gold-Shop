import type { Karat, MetalColor } from '../../domain/types';
import { alloySwatch } from '../../three/materials';

/** A small metallic disc in the alloy's rendered colour. */
export function Swatch({ color, karat = 18, size = 14 }: { color: MetalColor; karat?: Karat; size?: number }) {
  const base = alloySwatch(color, karat);
  return (
    <span
      aria-hidden
      className="swatch"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 28%, #fff 0%, ${base} 32%, color-mix(in oklab, ${base} 62%, #3a2a10) 100%)`,
      }}
    />
  );
}
