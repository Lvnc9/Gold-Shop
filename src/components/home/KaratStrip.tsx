import { ArrowRight } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { COLOR_LABEL, hallmark, KARAT_NOTE, money2 } from '../../domain/format';
import { colorAllowed, PURITY } from '../../domain/pricing';
import { bySlug } from '../../domain/products';
import type { Config, Karat, MetalColor } from '../../domain/types';
import { useLiveView } from '../../hooks/useLiveView';
import { useSpot } from '../../hooks/useSpot';
import { Swatch } from '../ui/Swatch';

const KARATS: Karat[] = [24, 22, 18, 14];
const COLORS: MetalColor[] = ['yellow', 'rose', 'white'];
const ALLOY_NOTE: Record<MetalColor, string> = {
  yellow: 'Gold alloyed with silver and copper in equal measure.',
  rose: 'More copper in the alloy warms the gold toward pink.',
  white: 'Palladium whitens the alloy; a rhodium skin brightens it.',
};

/** Interactive explainer: karat and colour recolour a live bangle and reprice a gram. */
export function KaratStrip() {
  const spot = useSpot();
  const bangle = bySlug('orbit-bangle')!;
  const [karat, setKarat] = useState<Karat>(18);
  const [color, setColor] = useState<MetalColor>('yellow');
  const config: Config = useMemo(() => ({ ...bangle.defaults, karat, color, variant: 1, engraving: '' }), [bangle, karat, color]);
  const { canvasRef, supported, view } = useLiveView(bangle, config, { autoRotate: true, margin: 0.95 });
  const perGram = spot.perGram * PURITY[karat];

  const pickKarat = (k: Karat) => {
    setKarat(k);
    if (!colorAllowed(k, color)) setColor('yellow');
    view?.flick(3);
  };
  const pickColor = (c: MetalColor) => {
    if (!colorAllowed(karat, c)) return;
    setColor(c);
    view?.flick(3);
  };
  const designable = bangle.karats.includes(karat) && bangle.colors.includes(color);

  return (
    <section className="wrap section" aria-labelledby="karat-title">
      <div className="karat velvet">
        <div className="karat__stage">
          {supported ? <canvas ref={canvasRef} aria-label={`Orbit Bangle in ${karat}k ${color} gold`} /> : <div className="hero__fallback" />}
          <motion.div key={`${karat}`} className="karat__stamp" initial={{ scale: 1.3, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
            {hallmark(karat)}
          </motion.div>
        </div>
        <div className="karat__panel">
          <p className="eyebrow">Choose your gold</p>
          <h2 id="karat-title">
            Purity changes <em>colour, hardness</em> and price.
          </h2>

          <fieldset className="field">
            <legend>Karat</legend>
            <div className="seg" role="radiogroup" aria-label="Karat">
              {KARATS.map((k) => (
                <button key={k} role="radio" aria-checked={karat === k} className="seg__opt" onClick={() => pickKarat(k)}>
                  {karat === k && <motion.span layoutId="karat-seg" className="seg__pill" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                  <span className="seg__label">{k}k</span>
                  <span className="seg__sub mono">{hallmark(k)}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="field">
            <legend>Colour</legend>
            <div className="swatches">
              {COLORS.map((c) => {
                const ok = colorAllowed(karat, c);
                return (
                  <button key={c} className={`swatch-btn${color === c ? ' is-on' : ''}`} aria-pressed={color === c} disabled={!ok} onClick={() => pickColor(c)} title={ok ? COLOR_LABEL[c] : '24k is only made in yellow'}>
                    <Swatch color={c} karat={karat === 24 ? 22 : karat} size={22} />
                    {COLOR_LABEL[c]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="karat__facts">
            <div>
              <span className="karat__label">Gold content</span>
              <div className="purity">
                <motion.span animate={{ width: `${PURITY[karat] * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
              </div>
              <span className="mono">{(PURITY[karat] * 100).toFixed(karat === 24 ? 2 : 1)}% pure</span>
            </div>
            <div>
              <span className="karat__label">Gold value per gram</span>
              <span className="karat__big mono">{money2(perGram)}</span>
            </div>
          </div>
          <p className="karat__note">
            {KARAT_NOTE[karat]} {karat === 24 ? 'Pure gold cannot be alloyed into rose or white.' : ALLOY_NOTE[color]}
          </p>
          {designable ? (
            <a href={`#p-${bangle.slug}`} className="btn btn--gold">
              Design the Orbit Bangle in {karat}k <ArrowRight size={18} weight="bold" />
            </a>
          ) : (
            <a href="#shop-bullion" className="btn btn--gold">
              See 999.9 bullion <ArrowRight size={18} weight="bold" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
