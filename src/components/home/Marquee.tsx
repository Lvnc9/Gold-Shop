import { useLayoutEffect, useRef } from 'react';
import { gsap, reducedMotion, scrollVelocity } from '../../motion/smooth';

const ITEMS = ['999.9 Fine', '916 · 22k', '750 · 18k', '585 · 14k', 'Assayed', 'Hallmarked', 'Recycled gold', 'Insured delivery', 'Buyback at spot −2%'];

/** Hallmark ticker. Speeds up with scroll velocity and eases back. */
export function Marquee() {
  const track = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reducedMotion() || !track.current) return;
    const ctx = gsap.context(() => {
      const tween = gsap.to(track.current, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
      const tick = () => {
        const v = scrollVelocity();
        const target = 1 + Math.min(Math.abs(v) * 0.12, 5);
        tween.timeScale(gsap.utils.interpolate(tween.timeScale(), target * (v < 0 ? -1 : 1), 0.08));
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    });
    return () => ctx.revert();
  }, []);
  const row = ITEMS.map((t, i) => (
    <span key={i} className="marquee__item">
      {t}
      <svg viewBox="0 0 10 10" aria-hidden>
        <path d="M5 0 6.2 3.8 10 5 6.2 6.2 5 10 3.8 6.2 0 5 3.8 3.8Z" />
      </svg>
    </span>
  ));
  return (
    <div className="marquee" aria-label="Fineness marks we strike: 999.9, 916, 750 and 585">
      <div className="marquee__track" ref={track} aria-hidden>
        <div className="marquee__set">{row}</div>
        <div className="marquee__set">{row}</div>
      </div>
    </div>
  );
}
