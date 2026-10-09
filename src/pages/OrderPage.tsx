import { ArrowRight, CheckCircle, Copy, Info } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { copyText } from '../components/layout/Footer';
import { money } from '../domain/format';
import { orderText, SHOP_CONTACT, type OrderRecord, type SaveResult } from '../services/orders';
import { load } from '../services/storage';
import { uiStore } from '../state/app';
import { useStore } from '../state/store';

const ease = [0.16, 1, 0.3, 1] as const;

export function OrderPage() {
  const { lastOrder } = useStore(uiStore);
  const stored = load<{ order: OrderRecord; result: SaveResult } | null>('solenne.lastOrder', null);
  const order = lastOrder ?? stored?.order;
  const result = stored?.order.code === order?.code ? stored?.result : undefined;

  if (!order) {
    return (
      <div className="wrap checkout checkout--empty">
        <h1>No recent order</h1>
        <a href="#shop" className="btn btn--gold">
          Browse the collection
        </a>
      </div>
    );
  }
  const text = orderText(order);
  const saved = result?.saved === true;

  return (
    <div className="wrap order">
      <motion.svg className="order__seal" viewBox="0 0 120 120" aria-hidden initial="hidden" animate="shown">
        <motion.circle cx="60" cy="60" r="54" variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1 } }} transition={{ duration: 1.2, ease }} />
        <motion.path d="M38 62 L54 77 L84 45" variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1 } }} transition={{ duration: 0.6, delay: 0.9, ease }} />
      </motion.svg>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3, ease }} className="order__head">
        <p className="eyebrow">Order received</p>
        <h1>Thank you, {order.customer.name.split(' ')[0]}.</h1>
        <p className="order__code mono">{order.code}</p>
      </motion.div>

      {saved ? (
        <p className="order__status order__status--ok">
          <CheckCircle size={20} weight="fill" /> Your order is in the atelier’s ledger. We will email {order.customer.email} within one business day to confirm
          the price and payment.
        </p>
      ) : (
        <div className="order__status order__status--warn">
          <p>
            <Info size={20} weight="fill" /> This view could not send the order to the atelier on its own. Copy the summary below and email it to{' '}
            <button className="copy-inline mono" onClick={() => copyText(SHOP_CONTACT, 'Email address copied')}>
              {SHOP_CONTACT}
            </button>
            , and we will confirm within one business day.
          </p>
        </div>
      )}

      <div className="order__card">
        <ul className="order__lines">
          {order.lines.map((l, i) => (
            <li key={i}>
              <span>
                {l.qty} × {l.name}
                <small>{l.summary}</small>
              </span>
              <span className="mono">{money(l.unit * l.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="sum-row">
          <span>Shipping</span>
          <span>{order.shipping ? money(order.shipping) : 'Free'}</span>
        </div>
        <div className="sum-row sum-row--total">
          <span>Total</span>
          <span className="mono">{money(order.total)}</span>
        </div>
      </div>

      <details className="order__text" open={!saved}>
        <summary>Order summary as text</summary>
        <pre>{text}</pre>
        <button className="btn btn--ghost" onClick={() => copyText(text, 'Order summary copied')}>
          <Copy size={18} /> Copy summary
        </button>
      </details>

      <a href="#shop" className="btn btn--gold">
        Continue browsing <ArrowRight size={18} />
      </a>
    </div>
  );
}
