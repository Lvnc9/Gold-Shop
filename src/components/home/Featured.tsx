import { ArrowRight } from '@phosphor-icons/react';
import { PRODUCTS } from '../../domain/products';
import { ProductCard } from '../ProductCard';

export function Featured() {
  const items = PRODUCTS.filter((p) => p.featured);
  return (
    <section className="wrap section featured" aria-labelledby="featured-title">
      <div className="section__head">
        <div>
          <p className="eyebrow">In the case this week</p>
          <h2 id="featured-title">Pieces worth weighing.</h2>
        </div>
        <a href="#shop" className="text-link">
          See all {PRODUCTS.length} pieces <ArrowRight size={16} />
        </a>
      </div>
      <div className="grid-cards">
        {items.map((p, i) => (
          <ProductCard key={p.slug} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}
