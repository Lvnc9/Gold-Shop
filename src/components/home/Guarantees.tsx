import { ArrowsClockwise, Certificate, ShieldCheck } from '@phosphor-icons/react';

const ITEMS = [
  { icon: ShieldCheck, title: 'Insured to your door', text: 'Every parcel is insured for its full value and needs a signature on delivery.' },
  { icon: ArrowsClockwise, title: 'Buyback at spot −2%', text: 'Sell any Solenne bar or round back to us at the day’s spot price less 2%.' },
  { icon: Certificate, title: 'Assay certificate', text: 'Each piece ships with its fineness, weight and serial, signed by our assayer.' },
];

export function Guarantees() {
  return (
    <section className="wrap section guarantees" aria-label="Our guarantees">
      {ITEMS.map((g) => (
        <div key={g.title} className="guarantee">
          <g.icon size={30} weight="duotone" className="guarantee__icon" />
          <h3>{g.title}</h3>
          <p>{g.text}</p>
        </div>
      ))}
    </section>
  );
}
