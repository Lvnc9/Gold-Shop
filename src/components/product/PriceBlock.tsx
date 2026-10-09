import { CaretDown } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { grams, money, money2, ozt, shortDate } from '../../domain/format';
import { PURITY } from '../../domain/pricing';
import type { Config, PriceBreakdown, Product } from '../../domain/types';
import type { Spot } from '../../state/app';
import { Money } from '../ui/Money';

/** Total, with an expandable breakdown that shows the arithmetic. */
export function PriceBlock({ product, config, breakdown: b, spot }: { product: Product; config: Config; breakdown: PriceBreakdown; spot: Spot }) {
  const [open, setOpen] = useState(false);
  const rows: [string, string, number][] = [
    ['Gold value', `${grams(b.grams)} × ${(PURITY[config.karat] * 100).toFixed(1)}% × ${money2(spot.perGram)}/g`, b.metal],
    product.premium != null
      ? ['Bullion premium', `${(product.premium * 100).toFixed(1)}% over metal`, b.making]
      : ['Craftsmanship', product.making?.type === 'pct' ? `${Math.round(product.making.value * 100)}% of metal value` : 'Fixed workshop fee', b.making],
  ];
  if (b.stones) rows.push(['Stones', product.stones!.label, b.stones]);
  if (b.engraving) rows.push(['Engraving', 'Hand engraved', b.engraving]);

  return (
    <div className="priceblock">
      <div className="priceblock__top">
        <Money value={b.total} className="priceblock__total" />
        <button className="priceblock__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          How it’s priced
          <motion.span animate={{ rotate: open ? 180 : 0 }}>
            <CaretDown size={14} />
          </motion.span>
        </button>
      </div>
      <p className="priceblock__spot mono">
        {grams(b.pureGrams)} pure gold ({ozt(b.pureGrams)}) · spot ${spot.perGram.toFixed(2)}/g, {shortDate(spot.asOf)}
      </p>
      <AnimatePresence initial={false}>
        {open && (
          <motion.dl className="breakdown" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            {rows.map(([k, how, v]) => (
              <div key={k} className="breakdown__row">
                <dt>
                  {k}
                  <span className="mono">{how}</span>
                </dt>
                <dd className="mono">{money(v)}</dd>
              </div>
            ))}
            <div className="breakdown__row breakdown__row--total">
              <dt>Total</dt>
              <dd className="mono">{money(b.total)}</dd>
            </div>
          </motion.dl>
        )}
      </AnimatePresence>
    </div>
  );
}
