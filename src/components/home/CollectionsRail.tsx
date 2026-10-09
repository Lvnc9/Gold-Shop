import { ArrowUpRight } from '@phosphor-icons/react';
import { useLayoutEffect, useRef } from 'react';
import { money } from '../../domain/format';
import { fromPrice } from '../../domain/pricing';
import { CATEGORIES, PRODUCTS } from '../../domain/products';
import { useSpot } from '../../hooks/useSpot';
import { gsap, reducedMotion, ScrollTrigger } from '../../motion/smooth';
import { ProductImage } from '../ui/ProductImage';

const HERO_OF: Record<string, string> = {
  rings: 'halo-eternity',
  necklaces: 'liquid-herringbone',
  bracelets: 'orbit-bangle',
  earrings: 'luna-hoops',
  bullion: 'meridian-round',
};

/** Five collections on a horizontal track; pinned and scrubbed by vertical scroll on wide screens. */
export function CollectionsRail() {
  const spot = useSpot();
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const el = track.current!;
      const distance = () => el.scrollWidth - el.clientWidth;
      gsap.to(el, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section.current,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      gsap.utils.toArray<HTMLElement>('.rail__panel', el).forEach((p) => {
        gsap.fromTo(p.querySelector('.rail__name'), { xPercent: 18 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: section.current, start: 'top top', end: () => `+=${distance()}`, scrub: true } });
      });
    });
    const t = setTimeout(() => ScrollTrigger.refresh(), 300);
    return () => {
      clearTimeout(t);
      mm.revert();
    };
  }, []);

  return (
    <section className="rail" ref={section} aria-labelledby="rail-title">
      <div className="rail__inner">
        <div className="wrap rail__head">
          <p className="eyebrow">The collections</p>
          <h2 id="rail-title">
            Five collections, <em>one standard</em> of gold.
          </h2>
        </div>
        <div className="rail__track" ref={track}>
          {CATEGORIES.map((c) => {
            const items = PRODUCTS.filter((p) => p.category === c.id);
            const lead = PRODUCTS.find((p) => p.slug === HERO_OF[c.id])!;
            const from = Math.min(...items.map((p) => fromPrice(p, spot.perGram)));
            return (
              <a key={c.id} href={`#shop-${c.id}`} className="rail__panel">
                <ProductImage product={lead} config={lead.defaults} className="rail__img" />
                <div className="rail__meta">
                  <h3 className="rail__name">{c.label}</h3>
                  <p className="rail__blurb">{c.blurb}</p>
                  <p className="rail__foot">
                    <span className="mono">
                      {items.length} {items.length === 1 ? 'piece' : 'pieces'} · from {money(from)}
                    </span>
                    <span className="rail__go">
                      Explore <ArrowUpRight size={16} />
                    </span>
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
