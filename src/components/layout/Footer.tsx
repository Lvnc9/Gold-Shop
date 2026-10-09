import { Copy } from '@phosphor-icons/react';
import { CATEGORIES } from '../../domain/products';
import { shortDate } from '../../domain/format';
import { useSpot } from '../../hooks/useSpot';
import { SHOP_CONTACT } from '../../services/orders';
import { toast } from '../../state/app';

export async function copyText(text: string, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(label, 'copy');
  } catch {
    toast('Select the text and copy it with your keyboard', 'copy');
  }
}

export function Footer({ isOwner }: { isOwner: boolean }) {
  const spot = useSpot();
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__grid">
        <div className="site-footer__brand">
          <p className="site-footer__word">Solenne</p>
          <p className="site-footer__line">Fine gold, cast to measure and priced by the gram.</p>
        </div>
        <div>
          <p className="eyebrow">Collections</p>
          <ul className="site-footer__list">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <a href={`#shop-${c.id}`}>{c.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow">Concierge</p>
          <ul className="site-footer__list">
            <li>
              <button className="copy-line" onClick={() => copyText(SHOP_CONTACT, 'Email address copied')}>
                <span className="mono">{SHOP_CONTACT}</span>
                <Copy size={15} />
              </button>
            </li>
            <li>Mon–Sat, 9:00–18:00 ET</li>
            <li>
              <a href="#atelier">How we make each piece</a>
            </li>
            {isOwner && (
              <li>
                <a href="#ledger" className="gold-link">
                  Order ledger
                </a>
              </li>
            )}
          </ul>
        </div>
        <div>
          <p className="eyebrow">Pricing</p>
          <p className="site-footer__note">
            Prices use a 24k spot of <strong className="mono">${spot.perGram.toFixed(2)}/g</strong>, as of {shortDate(spot.asOf)}. The final
            price is locked when we confirm your order.
          </p>
        </div>
      </div>
      <div className="wrap site-footer__base">
        <span>© 2026 Solenne Gold Atelier</span>
        <span>Every piece on this site is rendered live in your browser.</span>
      </div>
    </footer>
  );
}
