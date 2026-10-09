import { ArrowRight, Handbag, Minus, Plus, ShieldCheck, Trash, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { configSummary, money } from '../../domain/format';
import { price } from '../../domain/pricing';
import { bySlug } from '../../domain/products';
import { useSpot } from '../../hooks/useSpot';
import { lockScroll } from '../../motion/smooth';
import { go } from '../../router';
import { cartStore, cartTotals, FREE_SHIPPING_FROM, openCart, setQty, uiStore } from '../../state/app';
import { useStore } from '../../state/store';
import { Money } from '../ui/Money';
import { ProductImage } from '../ui/ProductImage';

export function CartDrawer() {
  const { cartOpen } = useStore(uiStore);
  const lines = useStore(cartStore);
  const spot = useSpot();
  const totals = cartTotals(lines, spot.perGram);
  const toFree = Math.max(0, FREE_SHIPPING_FROM - totals.subtotal);

  useEffect(() => {
    lockScroll(cartOpen);
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && openCart(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cartOpen]);

  return (
    <AnimatePresence>
      {cartOpen && (
        <div className="drawer-root">
          <motion.div className="drawer-scrim" onClick={() => openCart(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Your bag"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36 }}
          >
            <header className="drawer__head">
              <h2>Your bag</h2>
              <span className="mono drawer__count">{totals.count} {totals.count === 1 ? 'piece' : 'pieces'}</span>
              <button className="icon-btn" onClick={() => openCart(false)} aria-label="Close bag" autoFocus>
                <X size={22} />
              </button>
            </header>

            {lines.length === 0 ? (
              <div className="drawer__empty">
                <Handbag size={56} weight="thin" />
                <p>Your bag is empty.</p>
                <p className="muted">Pick a piece, choose its karat and finish, and it will wait for you here.</p>
                <button
                  className="btn btn--gold"
                  onClick={() => {
                    openCart(false);
                    go('#shop');
                  }}
                >
                  Browse the collection <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <>
                <div className="drawer__ship">
                  <p>{toFree > 0 ? <>Add <strong>{money(toFree)}</strong> for free insured shipping</> : <><ShieldCheck size={16} weight="fill" /> Free insured shipping unlocked</>}</p>
                  <div className="meter">
                    <motion.span animate={{ width: `${Math.min(100, (totals.subtotal / FREE_SHIPPING_FROM) * 100)}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
                  </div>
                </div>
                <ul className="drawer__lines" data-lenis-prevent>
                  <AnimatePresence initial={false}>
                    {lines.map((l) => {
                      const p = bySlug(l.slug);
                      if (!p) return null;
                      const unit = price(p, l.config, spot.perGram).total;
                      return (
                        <motion.li
                          key={l.id}
                          layout
                          className="line"
                          initial={{ opacity: 0, x: 40 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 60, height: 0, marginBlock: 0, paddingBlock: 0 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <a href={`#p-${p.slug}`} className="line__img" onClick={() => openCart(false)}>
                            <ProductImage product={p} config={l.config} />
                          </a>
                          <div className="line__body">
                            <a href={`#p-${p.slug}`} className="line__name" onClick={() => openCart(false)}>
                              {p.name}
                            </a>
                            <p className="line__meta">{configSummary(l.config)}</p>
                            <p className="line__meta">{p.variants[l.config.variant]?.label}</p>
                            <div className="line__foot">
                              <div className="stepper" role="group" aria-label={`Quantity of ${p.name}`}>
                                <button onClick={() => setQty(l.id, l.qty - 1)} aria-label="One fewer">
                                  {l.qty === 1 ? <Trash size={15} /> : <Minus size={15} />}
                                </button>
                                <span className="mono">{l.qty}</span>
                                <button onClick={() => setQty(l.id, l.qty + 1)} aria-label="One more" disabled={l.qty >= 9}>
                                  <Plus size={15} />
                                </button>
                              </div>
                              <Money value={unit * l.qty} className="line__price" />
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
                <footer className="drawer__foot">
                  <div className="sum-row">
                    <span>Subtotal</span>
                    <Money value={totals.subtotal} />
                  </div>
                  <div className="sum-row muted">
                    <span>Insured shipping</span>
                    <span>{totals.shipping ? money(totals.shipping) : 'Free'}</span>
                  </div>
                  <button
                    className="btn btn--gold btn--block"
                    onClick={() => {
                      openCart(false);
                      go('#checkout');
                    }}
                  >
                    Check out · <Money value={totals.total} />
                  </button>
                  <p className="fine">Gold is priced at today’s spot and locked when we confirm your order.</p>
                </footer>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
