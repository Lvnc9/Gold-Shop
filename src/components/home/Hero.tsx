import { ArrowRight, Scales, SealCheck, ShieldCheck } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { COLOR_LABEL, grams, hallmark, shortDate } from '../../domain/format';
import { price, sizeFactor } from '../../domain/pricing';
import { bySlug } from '../../domain/products';
import type { Config, Product } from '../../domain/types';
import { useLiveView } from '../../hooks/useLiveView';
import { useSpot } from '../../hooks/useSpot';
import { reducedMotion } from '../../motion/smooth';
import { Money } from '../ui/Money';

const PIECES: { slug: string; config?: Partial<Config> }[] = [
  { slug: 'aurora-solitaire', config: { karat: 18, color: 'yellow', variant: 1 } },
  { slug: 'miami-cuban', config: { karat: 18, color: 'yellow', variant: 2 } },
  { slug: 'assay-bar' },
];
const DWELL = 7000;
const ease = [0.16, 1, 0.3, 1] as const;

function Word({ children, i, italic }: { children: string; i: number; italic?: boolean }) {
  return (
    <span className="mask">
      <motion.span
        className={italic ? 'hero__em' : undefined}
        initial={{ y: '110%' }}
        animate={{ y: '0%' }}
        transition={{ duration: 1.1, delay: 0.15 + i * 0.08, ease }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export function Hero() {
  const spot = useSpot();
  const items = useMemo(
    () =>
      PIECES.map(({ slug, config }) => {
        const product = bySlug(slug)!;
        return { product, config: { ...product.defaults, ...config } as Config };
      }),
    [],
  );
  const [target, setTarget] = useState(0);
  const [shown, setShown] = useState(0);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);
  const { product, config } = items[shown];
  const { canvasRef, supported } = useLiveView(product, config, { autoRotate: true, parallax: true, margin: 0.92 });

  // Cross-fade between pieces: fade out, swap the model, fade in.
  useEffect(() => {
    if (target === shown) return;
    setFading(true);
    const t = setTimeout(() => {
      setShown(target);
      setFading(false);
    }, 380);
    return () => clearTimeout(t);
  }, [target, shown]);

  useEffect(() => {
    if (paused || reducedMotion()) return;
    const t = setTimeout(() => setTarget((i) => (i + 1) % items.length), DWELL);
    return () => clearTimeout(t);
  }, [target, paused, items.length]);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__box velvet">
        <div className="hero__copy">
          <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.1 }}>
            Fine gold atelier · hallmarked 585 to 999.9
          </motion.p>
          <h1 id="hero-title" className="hero__title">
            <Word i={0}>Gold,</Word> <Word i={1}>cast</Word> <Word i={2} italic>to your</Word> <Word i={3} italic>measure.</Word>
          </h1>
          <motion.p className="hero__lede" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.55, ease }}>
            Rings, chains and bullion priced live by the gram. Choose the karat, the colour and the finish, and watch your piece change
            as you decide.
          </motion.p>
          <motion.div className="hero__ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.7, ease }}>
            <a className="btn btn--gold" href="#p-heritage-signet">
              Design your signet <ArrowRight size={18} weight="bold" />
            </a>
            <a className="btn btn--velvet-ghost" href="#shop">
              Shop all 12 pieces
            </a>
          </motion.div>
          <motion.ul className="hero__facts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.9 }}>
            <li>
              <Scales size={22} weight="thin" />
              <span>
                <strong className="mono">${spot.perGram.toFixed(2)}/g</strong>
                24k spot, {shortDate(spot.asOf)}
              </span>
            </li>
            <li>
              <SealCheck size={22} weight="thin" />
              <span>
                <strong>Assayed</strong>
                and hallmarked
              </span>
            </li>
            <li>
              <ShieldCheck size={22} weight="thin" />
              <span>
                <strong>Insured</strong>
                door to door
              </span>
            </li>
          </motion.ul>
        </div>

        <div className="hero__stage" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
          <div className="hero__halo" aria-hidden />
          <motion.div
            className="hero__canvas"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: fading ? 0 : 1, scale: fading ? 0.96 : 1 }}
            transition={{ duration: fading ? 0.35 : 0.9, ease }}
          >
            {supported ? <canvas ref={canvasRef} aria-label={`${product.name}, rotating 3D render`} /> : <div className="hero__fallback" />}
          </motion.div>
          <HeroPlate product={product} config={config} spot={spot.perGram} />
          <div className="hero__picker" role="tablist" aria-label="Featured pieces">
            {items.map((it, i) => (
              <button
                key={it.product.slug}
                role="tab"
                aria-selected={target === i}
                className={`hero__pick${target === i ? ' is-on' : ''}`}
                onClick={() => setTarget(i)}
              >
                <span className="hero__pick-name">{it.product.name}</span>
                <span className="hero__pick-bar">
                  {target === i && !paused && (
                    <motion.span key={`${i}-${target}`} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: DWELL / 1000, ease: 'linear' }} />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroPlate({ product, config, spot }: { product: Product; config: Config; spot: number }) {
  const b = price(product, config, spot);
  const g = product.variants[config.variant].grams * sizeFactor(product, config.size);
  return (
    <motion.a href={`#p-${product.slug}`} className="hero__plate" key={product.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
      <span className="hallmark">{hallmark(config.karat)}</span>
      <span className="mono hero__plate-spec">
        {config.karat}k {COLOR_LABEL[config.color].split(' ')[0].toLowerCase()} · {grams(g)}
      </span>
      <Money value={b.total} className="hero__plate-price" />
      <ArrowRight size={16} />
    </motion.a>
  );
}
