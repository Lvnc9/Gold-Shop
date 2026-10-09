import { Heart, SlidersHorizontal } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { ProductCard } from '../components/ProductCard';
import { Swatch } from '../components/ui/Swatch';
import { fromPrice } from '../domain/pricing';
import { CATEGORIES, PRODUCTS } from '../domain/products';
import type { Category, MetalColor } from '../domain/types';
import { useSpot } from '../hooks/useSpot';
import { wishStore } from '../state/app';
import { useStore } from '../state/store';

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'weight';

export function ShopPage({ category, saved }: { category?: Category; saved?: boolean }) {
  const spot = useSpot();
  const wish = useStore(wishStore);
  const [metal, setMetal] = useState<MetalColor | 'any'>('any');
  const [sort, setSort] = useState<Sort>('featured');
  const cat = CATEGORIES.find((c) => c.id === category);

  const items = useMemo(() => {
    let list = PRODUCTS.filter((p) => (!category || p.category === category) && (!saved || wish.includes(p.slug)) && (metal === 'any' || p.colors.includes(metal)));
    const by = (f: (p: (typeof list)[number]) => number) => [...list].sort((a, b) => f(a) - f(b));
    if (sort === 'price-asc') list = by((p) => fromPrice(p, spot.perGram));
    if (sort === 'price-desc') list = by((p) => -fromPrice(p, spot.perGram));
    if (sort === 'weight') list = by((p) => -p.variants[p.variants.length - 1].grams);
    return list;
  }, [category, saved, wish, metal, sort, spot.perGram]);

  return (
    <div className="wrap shop">
      <header className="shop__head">
        <p className="eyebrow">{saved ? 'Your shortlist' : cat ? 'Collection' : 'The full case'}</p>
        <h1>{saved ? 'Saved pieces' : cat ? cat.label : 'Every piece'}</h1>
        <p className="shop__lede">{saved ? 'Pieces you marked with the heart, kept in this browser.' : cat ? cat.blurb : 'Twelve pieces in solid gold, each rendered live and priced from today’s spot.'}</p>
      </header>

      <div className="filters" role="region" aria-label="Filters">
        <nav className="filters__cats" aria-label="Category">
          <a href="#shop" className="chip" aria-pressed={!category && !saved}>
            All
          </a>
          {CATEGORIES.map((c) => (
            <a key={c.id} href={`#shop-${c.id}`} className="chip" aria-pressed={category === c.id}>
              {c.label}
            </a>
          ))}
          <a href="#saved" className="chip" aria-pressed={!!saved}>
            <Heart size={14} weight={saved ? 'fill' : 'regular'} /> Saved {wish.length > 0 && <span className="mono">{wish.length}</span>}
          </a>
        </nav>
        <div className="filters__right">
          <div className="filters__metal" role="group" aria-label="Metal colour">
            {(['any', 'yellow', 'rose', 'white'] as const).map((m) => (
              <button key={m} className="chip" aria-pressed={metal === m} onClick={() => setMetal(m)}>
                {m !== 'any' && <Swatch color={m} size={12} />}
                {m === 'any' ? 'Any metal' : m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <label className="select">
            <SlidersHorizontal size={16} />
            <span className="sr-only">Sort by</span>
            <select id="shop-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="featured">Featured</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
              <option value="weight">Heaviest first</option>
            </select>
          </label>
        </div>
      </div>

      <p className="shop__count mono" aria-live="polite">
        {items.length} {items.length === 1 ? 'piece' : 'pieces'}
      </p>
      <motion.div className="grid-cards" layout>
        <AnimatePresence mode="popLayout">
          {items.map((p, i) => (
            <ProductCard key={p.slug} product={p} index={i} />
          ))}
        </AnimatePresence>
      </motion.div>
      {items.length === 0 && (
        <div className="empty">
          <Heart size={44} weight="thin" />
          <p>{saved ? 'Nothing saved yet. Tap the heart on any piece to keep it here.' : 'No pieces match these filters.'}</p>
          <a className="btn btn--ghost" href="#shop">
            Show every piece
          </a>
        </div>
      )}
    </div>
  );
}
