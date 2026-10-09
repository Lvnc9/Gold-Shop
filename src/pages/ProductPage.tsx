import { ArrowLeft, Handbag, Heart, ShieldCheck, Truck } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { flyToCart } from '../components/layout/FlyLayer';
import { Configurator } from '../components/product/Configurator';
import { PriceBlock } from '../components/product/PriceBlock';
import { Viewer } from '../components/product/Viewer';
import { ProductCard } from '../components/ProductCard';
import { Money } from '../components/ui/Money';
import { COLOR_LABEL, FINISH_LABEL, grams, hallmark, ozt } from '../domain/format';
import { price } from '../domain/pricing';
import { CATEGORIES, PRODUCTS } from '../domain/products';
import type { Config, Product } from '../domain/types';
import { useSpot } from '../hooks/useSpot';
import { addToCart, openCart, toast, toggleWish, wishStore } from '../state/app';
import { useStore } from '../state/store';

const ease = [0.16, 1, 0.3, 1] as const;

export function ProductPage({ product }: { product: Product }) {
  const spot = useSpot();
  const [config, setConfig] = useState<Config>(product.defaults);
  const wish = useStore(wishStore).includes(product.slug);
  const b = price(product, config, spot.perGram);
  const cat = CATEGORIES.find((c) => c.id === product.category)!;
  const related = [...PRODUCTS.filter((p) => p.category === product.category && p.slug !== product.slug), ...PRODUCTS.filter((p) => p.featured && p.category !== product.category)].slice(0, 4);

  const add = (e: React.MouseEvent<HTMLButtonElement>) => {
    addToCart(product.slug, config);
    flyToCart(e.currentTarget);
    toast(`${product.name} added to your bag`, 'bag');
  };

  const variant = product.variants[config.variant];
  const specs: [string, string][] = [
    ['Metal', `${config.karat}k ${COLOR_LABEL[config.color].toLowerCase()}`],
    ['Fineness', hallmark(config.karat)],
    ['Gold weight', `${grams(b.grams)} · ${ozt(b.grams)}`],
    ['Pure gold', grams(b.pureGrams)],
    ['Dimensions', variant.dims],
  ];
  if (product.sizes && config.size) specs.push([product.sizes.label, config.size]);
  if (product.stones) specs.push(['Stones', product.stones.label]);
  specs.push(['Finish', FINISH_LABEL[config.finish]]);
  specs.push(['Lead time', product.leadTime]);

  return (
    <div className="product">
      <div className="wrap product__grid">
        <div className="product__stage">
          <Viewer product={product} config={config} />
        </div>

        <motion.div className="product__panel" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.1, ease }}>
          <nav className="crumbs" aria-label="Breadcrumb">
            <a href="#shop">
              <ArrowLeft size={14} /> Shop
            </a>
            <span aria-hidden>/</span>
            <a href={`#shop-${cat.id}`}>{cat.label}</a>
          </nav>
          <h1 className="product__name">{product.name}</h1>
          <p className="product__tag">{product.tagline}</p>

          <PriceBlock product={product} config={config} breakdown={b} spot={spot} />

          <Configurator product={product} config={config} spot={spot.perGram} onChange={(patch) => setConfig((c) => ({ ...c, ...patch }))} />

          <div className="buy">
            <button className="btn btn--gold buy__add" onClick={add}>
              <Handbag size={20} weight="duotone" /> Add to bag · <Money value={b.total} />
            </button>
            <motion.button
              className={`buy__wish${wish ? ' is-on' : ''}`}
              whileTap={{ scale: 0.85 }}
              aria-pressed={wish}
              aria-label={wish ? 'Remove from saved' : 'Save for later'}
              onClick={() => {
                const on = toggleWish(product.slug);
                toast(on ? `Saved ${product.name}` : 'Removed from saved', 'heart');
              }}
            >
              <Heart size={22} weight={wish ? 'fill' : 'regular'} />
            </motion.button>
          </div>
          <ul className="assure">
            <li>
              <Truck size={18} weight="duotone" /> {product.leadTime}
            </li>
            <li>
              <ShieldCheck size={18} weight="duotone" /> Insured delivery, assay certificate included
            </li>
          </ul>

          <section className="product__story" aria-label="About this piece">
            <p>{product.story}</p>
          </section>

          <dl className="specs">
            {specs.map(([k, v]) => (
              <div key={k} className="specs__row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>

      <section className="wrap section" aria-labelledby="related-title">
        <div className="section__head">
          <h2 id="related-title">You may also weigh</h2>
        </div>
        <div className="grid-cards">
          {related.map((p, i) => (
            <ProductCard key={p.slug} product={p} index={i} />
          ))}
        </div>
      </section>

      <div className="buybar">
        <div className="buybar__price">
          <span className="mono">
            {config.karat}k · {grams(b.grams)}
          </span>
          <Money value={b.total} />
        </div>
        <button
          className="btn btn--gold"
          onClick={(e) => {
            add(e);
            setTimeout(() => openCart(), 500);
          }}
        >
          <Handbag size={18} weight="duotone" /> Add to bag
        </button>
      </div>
    </div>
  );
}
