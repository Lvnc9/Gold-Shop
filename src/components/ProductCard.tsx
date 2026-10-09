import { Heart, Plus } from '@phosphor-icons/react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useRef } from 'react';
import { hallmark, money } from '../domain/format';
import { fromPrice } from '../domain/pricing';
import type { Product } from '../domain/types';
import { useSpot } from '../hooks/useSpot';
import { addToCart, toast, toggleWish, wishStore } from '../state/app';
import { useStore } from '../state/store';
import { flyToCart } from './layout/FlyLayer';
import { ProductImage } from './ui/ProductImage';
import { Swatch } from './ui/Swatch';

/** Catalogue card: tilts toward the pointer, a light sweep follows it. */
export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const spot = useSpot();
  const wish = useStore(wishStore).includes(product.slug);
  const ref = useRef<HTMLElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [5, -5]), { stiffness: 220, damping: 22 });
  const ry = useSpring(useTransform(mx, [0, 1], [-6, 6]), { stiffness: 220, damping: 22 });
  const glare = useTransform([mx, my], ([x, y]: number[]) => `radial-gradient(420px circle at ${x * 100}% ${y * 100}%, rgba(255,226,160,0.22), transparent 45%)`);

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const r = ref.current!.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  const quickAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    addToCart(product.slug, product.defaults);
    flyToCart(e.currentTarget);
    toast(`${product.name} added to your bag`, 'bag');
  };
  const heart = (e: React.MouseEvent) => {
    e.preventDefault();
    const on = toggleWish(product.slug);
    toast(on ? `Saved ${product.name}` : `Removed ${product.name} from saved`, 'heart');
  };

  return (
    <motion.article
      ref={ref}
      className="pcard"
      layout
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.8, delay: (index % 4) * 0.07, ease: [0.16, 1, 0.3, 1] }}
      style={{ rotateX: rx, rotateY: ry }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <a href={`#p-${product.slug}`} className="pcard__link" aria-label={`${product.name}, from ${money(fromPrice(product, spot.perGram))}`}>
        <div className="pcard__media">
          <ProductImage product={product} config={product.defaults} />
          <motion.span className="pcard__glare" style={{ background: glare }} aria-hidden />
          <span className="hallmark pcard__hallmark">{product.karats.map(hallmark).join(' / ')}</span>
        </div>
        <div className="pcard__body">
          <div className="pcard__row">
            <h3 className="pcard__name">{product.name}</h3>
            <span className="pcard__price mono">from {money(fromPrice(product, spot.perGram))}</span>
          </div>
          <p className="pcard__tag">{product.tagline}</p>
          <div className="pcard__swatches" aria-label={`Available in ${product.colors.join(', ')} gold`}>
            {product.colors.map((c) => (
              <Swatch key={c} color={c} />
            ))}
            <span className="pcard__karats mono">{product.karats.map((k) => `${k}k`).join(' · ')}</span>
          </div>
        </div>
      </a>
      <motion.button className={`pcard__wish${wish ? ' is-on' : ''}`} onClick={heart} aria-pressed={wish} aria-label={wish ? 'Remove from saved' : 'Save'} whileTap={{ scale: 0.8 }}>
        <Heart size={18} weight={wish ? 'fill' : 'regular'} />
      </motion.button>
      <motion.button className="pcard__add" onClick={quickAdd} aria-label={`Add ${product.name} to bag`} whileTap={{ scale: 0.9 }}>
        <Plus size={18} weight="bold" />
        <span>Quick add</span>
      </motion.button>
    </motion.article>
  );
}
