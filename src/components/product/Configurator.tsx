import { Check, Info } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useId } from 'react';
import { COLOR_LABEL, FINISH_LABEL, grams, hallmark, KARAT_NOTE, money } from '../../domain/format';
import { colorAllowed, ENGRAVING_FEE, price, sizeFactor } from '../../domain/pricing';
import type { Config, Finish, Product } from '../../domain/types';
import { Swatch } from '../ui/Swatch';

const spring = { type: 'spring', stiffness: 420, damping: 34 } as const;

const VARIANT_TITLE: Record<string, string> = {
  rings: 'Band',
  necklaces: 'Width',
  bracelets: 'Width',
  earrings: 'Diameter',
  bullion: 'Weight',
};

const FINISH_SWATCH: Record<Finish, string> = {
  polished: 'radial-gradient(circle at 30% 25%, #fff 0 8%, #f1cf7f 22%, #a8781f 100%)',
  satin: 'repeating-linear-gradient(90deg, #e8c77e 0 2px, #d9b465 2px 3px), linear-gradient(#e0bd70, #b58a33)',
  hammered: 'radial-gradient(circle at 30% 30%, #f7da92 0 18%, transparent 19%), radial-gradient(circle at 70% 60%, #f2d088 0 16%, transparent 17%), radial-gradient(circle at 40% 80%, #f5d58e 0 14%, transparent 15%), linear-gradient(135deg, #d2a64f, #9b6f20)',
};

interface Props {
  product: Product;
  config: Config;
  spot: number;
  onChange: (patch: Partial<Config>) => void;
}

/** Stepped choices. Steps are numbered because they are made in this order. */
export function Configurator({ product, config, spot, onChange }: Props) {
  const steps: { key: string; title: string; value: string; body: React.ReactNode }[] = [];
  const base = price(product, config, spot).total;
  const delta = (patch: Partial<Config>) => price(product, { ...config, ...patch }, spot).total - base;
  const fmtDelta = (d: number) => (Math.abs(d) < 1 ? 'included' : `${d > 0 ? '+' : '−'}${money(Math.abs(d))}`);

  if (product.colors.length > 1)
    steps.push({
      key: 'color',
      title: 'Metal colour',
      value: COLOR_LABEL[config.color],
      body: (
        <div className="opt-row">
          {product.colors.map((c) => {
            const ok = colorAllowed(config.karat, c);
            return (
              <button key={c} className={`opt opt--swatch${config.color === c ? ' is-on' : ''}`} aria-pressed={config.color === c} disabled={!ok} onClick={() => onChange({ color: c })}>
                {config.color === c && <motion.span layoutId="sel-color" className="opt__ring" transition={spring} />}
                <Swatch color={c} karat={config.karat === 24 ? 22 : config.karat} size={28} />
                <span>{COLOR_LABEL[c]}</span>
              </button>
            );
          })}
        </div>
      ),
    });

  if (product.karats.length > 1)
    steps.push({
      key: 'karat',
      title: 'Karat',
      value: `${config.karat}k · ${hallmark(config.karat)}`,
      body: (
        <>
          <div className="seg seg--light" role="radiogroup" aria-label="Karat">
            {product.karats.map((k) => (
              <button
                key={k}
                role="radio"
                aria-checked={config.karat === k}
                className="seg__opt"
                onClick={() => onChange({ karat: k, color: colorAllowed(k, config.color) ? config.color : 'yellow' })}
              >
                {config.karat === k && <motion.span layoutId="sel-karat" className="seg__pill" transition={spring} />}
                <span className="seg__label">{k}k</span>
                <span className="seg__sub mono">{config.karat === k ? hallmark(k) : fmtDelta(delta({ karat: k }))}</span>
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.p key={config.karat} className="opt-note" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Info size={15} /> {KARAT_NOTE[config.karat]}
            </motion.p>
          </AnimatePresence>
        </>
      ),
    });

  if (product.sizes) {
    const s = product.sizes;
    steps.push({
      key: 'size',
      title: s.label,
      value: config.size ?? s.default,
      body: (
        <div className="size-row" role="radiogroup" aria-label={s.label}>
          {s.options.map((o) => (
            <button key={o} role="radio" aria-checked={config.size === o} className={`size${config.size === o ? ' is-on' : ''}`} onClick={() => onChange({ size: o })}>
              {config.size === o && <motion.span layoutId="sel-size" className="size__bg" transition={spring} />}
              <span>{o}</span>
            </button>
          ))}
        </div>
      ),
    });
  }

  if (product.variants.length > 1)
    steps.push({
      key: 'variant',
      title: VARIANT_TITLE[product.category],
      value: product.variants[config.variant].label,
      body: (
        <div className="variant-row">
          {product.variants.map((v, i) => (
            <button key={v.label} className={`variant${config.variant === i ? ' is-on' : ''}`} aria-pressed={config.variant === i} onClick={() => onChange({ variant: i })}>
              {config.variant === i && <motion.span layoutId="sel-variant" className="variant__ring" transition={spring} />}
              <span className="variant__label">{v.label}</span>
              <span className="variant__meta mono">{grams(v.grams * sizeFactor(product, config.size))}</span>
              <span className="variant__meta mono">{config.variant === i ? 'selected' : fmtDelta(delta({ variant: i }))}</span>
            </button>
          ))}
        </div>
      ),
    });

  if (product.finishes.length > 1)
    steps.push({
      key: 'finish',
      title: 'Finish',
      value: FINISH_LABEL[config.finish],
      body: (
        <div className="opt-row">
          {product.finishes.map((f) => (
            <button key={f} className={`opt opt--swatch${config.finish === f ? ' is-on' : ''}`} aria-pressed={config.finish === f} onClick={() => onChange({ finish: f })}>
              {config.finish === f && <motion.span layoutId="sel-finish" className="opt__ring" transition={spring} />}
              <span className="finish-dot" style={{ background: FINISH_SWATCH[f] }} aria-hidden />
              <span>{FINISH_LABEL[f]}</span>
            </button>
          ))}
        </div>
      ),
    });

  if (product.engraving)
    steps.push({
      key: 'engraving',
      title: 'Engraving',
      value: config.engraving.trim() ? `“${config.engraving.trim()}”` : 'None',
      body: <Engraving product={product} config={config} onChange={onChange} />,
    });

  return (
    <ol className="config">
      {steps.map((s, i) => (
        <li key={s.key} className="config__step">
          <div className="config__head">
            <span className="config__num mono" aria-hidden>
              {i + 1}
            </span>
            <span className="config__title">{s.title}</span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={s.value} className="config__value" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                <Check size={14} weight="bold" /> {s.value}
              </motion.span>
            </AnimatePresence>
          </div>
          {s.body}
        </li>
      ))}
    </ol>
  );
}

function Engraving({ product, config, onChange }: { product: Product; config: Config; onChange: Props['onChange'] }) {
  const id = useId();
  const e = product.engraving!;
  const monogram = e.where === 'on the face';
  return (
    <div className="engrave">
      <label htmlFor={`${id}-engrave`} className="engrave__label">
        {monogram ? 'Up to 3 initials' : `Up to ${e.maxChars} characters`}, engraved {e.where}
      </label>
      <div className="engrave__field">
        <input
          id={`${id}-engrave`}
          type="text"
          value={config.engraving}
          maxLength={e.maxChars}
          placeholder={monogram ? 'e.g. AVR' : 'e.g. Always, M & J'}
          autoComplete="off"
          spellCheck={false}
          onChange={(ev) => {
            let v = ev.target.value;
            if (monogram) v = v.replace(/[^a-z]/gi, '').toUpperCase();
            onChange({ engraving: v.slice(0, e.maxChars) });
          }}
        />
        <span className="engrave__count mono">
          {config.engraving.length}/{e.maxChars}
        </span>
      </div>
      <p className="opt-note">
        <Info size={15} /> {money(ENGRAVING_FEE)} · engraved by hand in a Roman serif. It appears on the model as you type.
      </p>
    </div>
  );
}
