import { ArrowLeft, Lock, Lightning, ShieldCheck, Spinner } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Money } from '../components/ui/Money';
import { ProductImage } from '../components/ui/ProductImage';
import { configSummary, money } from '../domain/format';
import type { CartLine } from '../domain/types';
import { price } from '../domain/pricing';
import { bySlug } from '../domain/products';
import { useSpot } from '../hooks/useSpot';
import { go } from '../router';
import { orderCode, saveOrder, type Customer, type OrderRecord } from '../services/orders';
import { load, save } from '../services/storage';
import { cartStore, cartTotals, clearCart, EXPRESS_FEE, toast, uiStore } from '../state/app';
import { useStore } from '../state/store';

const EMPTY: Customer = { name: '', email: '', phone: '', address: '', city: '', postal: '', country: 'United States', notes: '' };
const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'United Arab Emirates', 'Australia', 'Japan'];

type Errors = Partial<Record<keyof Customer, string>>;

function validate(c: Customer): Errors {
  const e: Errors = {};
  if (c.name.trim().length < 2) e.name = 'Enter the full name for the delivery.';
  if (!/^\S+@\S+\.\S+$/.test(c.email)) e.email = 'Enter an email like name@example.com.';
  if (c.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a phone number the courier can call.';
  if (c.address.trim().length < 4) e.address = 'Enter a street address.';
  if (!c.city.trim()) e.city = 'Enter a city.';
  if (!c.postal.trim()) e.postal = 'Enter a postal code.';
  return e;
}

export function CheckoutPage() {
  const spot = useSpot();
  const cart = useStore(cartStore);
  // Lines as placed: the cart is cleared before the page leaves, and the exit animation must not flash "bag is empty".
  const [placed, setPlaced] = useState<CartLine[] | null>(null);
  const lines = placed ?? cart;
  const [customer, setCustomer] = useState<Customer>(() => ({ ...EMPTY, ...load<Partial<Customer>>('solenne.customer', {}) }));
  const [delivery, setDelivery] = useState<'insured' | 'express'>('insured');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const totals = cartTotals(lines, spot.perGram, delivery);

  if (lines.length === 0) {
    return (
      <div className="wrap checkout checkout--empty">
        <h1>Your bag is empty</h1>
        <p>Add a piece before checking out.</p>
        <a href="#shop" className="btn btn--gold">
          Browse the collection
        </a>
      </div>
    );
  }

  const set = (k: keyof Customer) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const next = { ...customer, [k]: e.target.value };
    setCustomer(next);
    if (errors[k]) setErrors(validate(next));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(customer);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`co-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    save('solenne.customer', { ...customer, notes: '' });
    const order: OrderRecord = {
      code: orderCode(),
      createdAt: new Date().toISOString(),
      customer,
      delivery,
      lines: lines.flatMap((l) => {
        const p = bySlug(l.slug);
        return p ? [{ slug: p.slug, name: p.name, summary: `${configSummary(l.config)} · ${p.variants[l.config.variant].label}`, qty: l.qty, unit: price(p, l.config, spot.perGram).total, config: l.config }] : [];
      }),
      spotPerGram: spot.perGram,
      spotAsOf: spot.asOf,
      subtotal: totals.subtotal,
      shipping: totals.shipping,
      total: totals.total,
      status: 'received',
    };
    const result = await saveOrder(order);
    // The API re-prices at its own spot; the store already holds the new price, so the summary redraws.
    if (!result.saved && (result.reason === 'price-changed' || result.reason === 'busy')) {
      setBusy(false);
      toast(result.reason === 'price-changed' ? `Gold moved. New total ${money(result.total)}` : 'The atelier is busy. Try again in a minute.');
      return;
    }
    const placedOrder = result.saved && result.order ? result.order : order;
    uiStore.set((s) => ({ ...s, lastOrder: placedOrder }));
    save('solenne.lastOrder', { order: placedOrder, result });
    setPlaced(lines);
    clearCart();
    setBusy(false);
    go('#order');
  };

  const field = (k: keyof Customer, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className={`input${errors[k] ? ' has-error' : ''}`}>
      <label htmlFor={`co-${k}`}>{label}</label>
      <input id={`co-${k}`} value={customer[k]} onChange={set(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `co-${k}-err` : undefined} {...props} />
      {errors[k] && (
        <motion.span id={`co-${k}-err`} className="input__err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          {errors[k]}
        </motion.span>
      )}
    </div>
  );

  return (
    <div className="wrap checkout">
      <a href="#shop" className="crumbs">
        <ArrowLeft size={14} /> Keep shopping
      </a>
      <h1>Checkout</h1>
      <form className="checkout__grid" onSubmit={submit} noValidate>
        <div className="checkout__form">
          <fieldset className="co-section">
            <legend>
              <span className="config__num mono">1</span> Contact
            </legend>
            <div className="input-grid">
              {field('name', 'Full name', { autoComplete: 'name' })}
              {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
              {field('phone', 'Phone', { type: 'tel', autoComplete: 'tel' })}
            </div>
          </fieldset>
          <fieldset className="co-section">
            <legend>
              <span className="config__num mono">2</span> Delivery address
            </legend>
            <div className="input-grid">
              {field('address', 'Street address', { autoComplete: 'street-address' })}
              {field('city', 'City', { autoComplete: 'address-level2' })}
              {field('postal', 'Postal code', { autoComplete: 'postal-code' })}
              <div className="input">
                <label htmlFor="co-country">Country</label>
                <select id="co-country" value={customer.country} onChange={set('country')} autoComplete="country-name">
                  {COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>
          <fieldset className="co-section">
            <legend>
              <span className="config__num mono">3</span> Shipping
            </legend>
            <div className="ship-opts">
              {(
                [
                  ['insured', ShieldCheck, 'Insured courier', '3–5 days after the piece is ready', totals.subtotal >= 500 ? 'Free' : money(25)],
                  ['express', Lightning, 'Express insured', 'Next business day after it is ready', money(EXPRESS_FEE)],
                ] as const
              ).map(([id, Icon, title, sub, fee]) => (
                <label key={id} className={`ship-opt${delivery === id ? ' is-on' : ''}`}>
                  <input type="radio" name="delivery" id={`co-ship-${id}`} checked={delivery === id} onChange={() => setDelivery(id)} />
                  <Icon size={22} weight="duotone" />
                  <span>
                    <strong>{title}</strong>
                    <small>{sub}</small>
                  </span>
                  <span className="mono">{fee}</span>
                </label>
              ))}
            </div>
            <div className="input">
              <label htmlFor="co-notes">Notes for the atelier (optional)</label>
              <textarea id="co-notes" rows={3} value={customer.notes} onChange={set('notes')} placeholder="Gift wrapping, a delivery window, a question about sizing…" />
            </div>
          </fieldset>
          <div className="co-pay">
            <Lock size={20} weight="duotone" />
            <p>
              <strong>No card needed today.</strong> We confirm your order and lock the gold price within one business day, then arrange
              payment by bank transfer or card.
            </p>
          </div>
        </div>

        <aside className="checkout__summary">
          <h2>Order summary</h2>
          <ul className="sum-lines">
            {lines.map((l) => {
              const p = bySlug(l.slug);
              if (!p) return null;
              return (
                <li key={l.id}>
                  <div className="sum-lines__img">
                    <ProductImage product={p} config={l.config} />
                    <span className="badge">{l.qty}</span>
                  </div>
                  <div>
                    <p className="sum-lines__name">{p.name}</p>
                    <p className="sum-lines__meta">{configSummary(l.config)}</p>
                  </div>
                  <span className="mono">{money(price(p, l.config, spot.perGram).total * l.qty)}</span>
                </li>
              );
            })}
          </ul>
          <div className="sum-row">
            <span>Subtotal</span>
            <Money value={totals.subtotal} />
          </div>
          <div className="sum-row">
            <span>Shipping</span>
            <span>{totals.shipping ? money(totals.shipping) : 'Free'}</span>
          </div>
          <div className="sum-row sum-row--total">
            <span>Total</span>
            <Money value={totals.total} />
          </div>
          <button type="submit" className="btn btn--gold btn--block" disabled={busy}>
            {busy ? (
              <>
                <Spinner size={18} className="spin" /> Placing order…
              </>
            ) : (
              <>Place order · {money(totals.total)}</>
            )}
          </button>
          <p className="fine">
            Priced at ${spot.perGram.toFixed(2)}/g 24k spot. If spot moves more than 2% before we confirm, we will ask you before going ahead.
          </p>
        </aside>
      </form>
    </div>
  );
}
