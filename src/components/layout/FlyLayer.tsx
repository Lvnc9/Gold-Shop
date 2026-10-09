import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { reducedMotion } from '../../motion/smooth';

interface Flight {
  id: number;
  from: DOMRect;
  to: DOMRect;
}

let push: ((f: Flight) => void) | null = null;

/** Sends a gold bead from an element to the bag icon. */
export function flyToCart(from: Element) {
  const target = document.getElementById('cart-button');
  if (!push || !target || reducedMotion()) return;
  push({ id: Date.now() + Math.random(), from: from.getBoundingClientRect(), to: target.getBoundingClientRect() });
}

export function FlyLayer() {
  const [flights, setFlights] = useState<Flight[]>([]);
  useEffect(() => {
    push = (f) => setFlights((all) => [...all, f]);
    return () => {
      push = null;
    };
  }, []);
  return (
    <div className="fly-layer" aria-hidden>
      <AnimatePresence>
        {flights.map((f) => {
          const x0 = f.from.left + f.from.width / 2 - 9;
          const y0 = f.from.top + f.from.height / 2 - 9;
          const x1 = f.to.left + f.to.width / 2 - 9;
          const y1 = f.to.top + f.to.height / 2 - 9;
          return (
            <motion.span
              key={f.id}
              className="fly-bead"
              initial={{ x: x0, y: y0, scale: 1, opacity: 1 }}
              animate={{ x: [x0, (x0 + x1) / 2, x1], y: [y0, Math.min(y0, y1) - 120, y1], scale: [1, 1.4, 0.4], opacity: [1, 1, 0.2] }}
              transition={{ duration: 0.85, ease: [0.5, 0, 0.2, 1] }}
              onAnimationComplete={() => setFlights((all) => all.filter((x) => x.id !== f.id))}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
