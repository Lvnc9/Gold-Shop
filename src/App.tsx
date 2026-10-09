import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { CartDrawer } from './components/layout/CartDrawer';
import { FlyLayer } from './components/layout/FlyLayer';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { Toast } from './components/layout/Toast';
import { bySlug } from './domain/products';
import { ScrollTrigger, scrollToId, scrollToTop, startSmoothScroll } from './motion/smooth';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { LedgerPage } from './pages/LedgerPage';
import { OrderPage } from './pages/OrderPage';
import { ProductPage } from './pages/ProductPage';
import { ShopPage } from './pages/ShopPage';
import { parse, useHash, type Route } from './router';
import { viewerIsOwner } from './services/orders';
import { watchSpot } from './services/spot';

function pageKey(r: Route) {
  if (r.name === 'product') return `p-${r.slug}`;
  if (r.name === 'shop') return 'shop'; // filters animate in place
  return r.name;
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'shop':
      return <ShopPage category={route.category} saved={route.saved} />;
    case 'product': {
      const p = bySlug(route.slug);
      return p ? <ProductPage key={p.slug} product={p} /> : <HomePage />;
    }
    case 'checkout':
      return <CheckoutPage />;
    case 'order':
      return <OrderPage />;
    case 'ledger':
      return <LedgerPage />;
    default:
      return <HomePage />;
  }
}

export function App() {
  const route = parse(useHash());
  const key = pageKey(route);
  const [isOwner, setOwner] = useState(false);

  useEffect(() => {
    startSmoothScroll();
    watchSpot();
    viewerIsOwner().then(setOwner);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  // Home anchors (#atelier) scroll within the page instead of switching pages.
  useEffect(() => {
    if (route.name === 'home' && route.anchor) setTimeout(() => scrollToId(route.anchor!), 60);
  }, [route.name, route.name === 'home' ? route.anchor : '']);

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
        Skip to content
      </a>
      <Header route={route} />
      <AnimatePresence
        mode="wait"
        onExitComplete={() => {
          scrollToTop();
          requestAnimationFrame(() => ScrollTrigger.refresh());
        }}
      >
        <motion.main
          key={key}
          id="main"
          tabIndex={-1}
          className={`page page--${route.name}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Page route={route} />
        </motion.main>
      </AnimatePresence>
      <Footer isOwner={isOwner} />
      <CartDrawer />
      <FlyLayer />
      <Toast />
    </>
  );
}
