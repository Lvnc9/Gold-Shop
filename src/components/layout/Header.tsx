import { Handbag, Heart, List, X } from '@phosphor-icons/react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useEffect, useState } from 'react';
import { CATEGORIES } from '../../domain/products';
import { shortDate } from '../../domain/format';
import { useSpot } from '../../hooks/useSpot';
import type { Route } from '../../router';
import { cartStore, cartTotals, openCart, wishStore } from '../../state/app';
import { useStore } from '../../state/store';

export function Header({ route }: { route: Route }) {
  const spot = useSpot();
  const lines = useStore(cartStore);
  const wish = useStore(wishStore);
  const { count } = cartTotals(lines, spot.perGram);
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const [menu, setMenu] = useState(false);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(y > 24);
    setHidden(y > 320 && y > prev && !menu);
  });
  useEffect(() => setMenu(false), [route]);

  const active = route.name === 'shop' ? route.category ?? 'all' : '';

  return (
    <motion.header
      className={`site-header${solid || route.name !== 'home' ? ' is-solid' : ''}`}
      animate={{ y: hidden ? '-110%' : '0%' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="wrap site-header__row">
        <a href="#" className="wordmark" aria-label="Solenne, home">
          <span className="wordmark__name">Solenne</span>
          <span className="wordmark__mark mono">AU · 750</span>
        </a>

        <nav className="site-nav" aria-label="Collections">
          {CATEGORIES.map((c) => (
            <a key={c.id} href={`#shop-${c.id}`} className={active === c.id ? 'is-active' : ''}>
              {c.label}
            </a>
          ))}
        </nav>

        <div className="site-header__tools">
          <span className="spot-pill mono" title={`24k spot price, ${shortDate(spot.asOf)}`}>
            <span className="spot-pill__dot" aria-hidden />
            Au 24k <strong>${spot.perGram.toFixed(2)}</strong>/g
          </span>
          <a href="#saved" className="icon-btn badge-host" aria-label={`Wishlist, ${wish.length} saved`}>
            <Heart size={22} weight={wish.length ? 'fill' : 'light'} />
            {wish.length > 0 && <span className="badge">{wish.length}</span>}
          </a>
          <button className="icon-btn badge-host" id="cart-button" aria-label={`Bag, ${count} items`} onClick={() => openCart()}>
            <Handbag size={22} weight="light" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  className="badge"
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button className="icon-btn menu-btn" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            {menu ? <X size={22} /> : <List size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menu && (
          <motion.nav
            className="mobile-nav"
            aria-label="Collections"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="wrap mobile-nav__list">
              <a href="#shop">All pieces</a>
              {CATEGORIES.map((c, i) => (
                <motion.a
                  key={c.id}
                  href={`#shop-${c.id}`}
                  initial={{ x: -16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.05 * i + 0.1 }}
                >
                  {c.label}
                </motion.a>
              ))}
              <span className="mono mobile-nav__spot">
                Au 24k ${spot.perGram.toFixed(2)}/g · {shortDate(spot.asOf)}
              </span>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
