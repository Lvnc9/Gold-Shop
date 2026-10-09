import { Fire, Package, PencilSimpleLine, SealCheck, Sparkle } from '@phosphor-icons/react';
import { motion, useScroll, useSpring } from 'motion/react';
import { useRef } from 'react';

const STEPS = [
  { icon: PencilSimpleLine, title: 'Measure', when: 'Day 1', text: 'We confirm size, karat and engraving, and send you a render to approve.' },
  { icon: Fire, title: 'Cast', when: 'Days 2–4', text: 'Your alloy is weighed, melted and lost-wax cast in our workshop.' },
  { icon: Sparkle, title: 'Set & polish', when: 'Days 4–6', text: 'Stones are set under magnification and every surface is finished by hand.' },
  { icon: SealCheck, title: 'Assay', when: 'Day 7', text: 'Each piece is tested and struck with its fineness: 585, 750, 916 or 999.9.' },
  { icon: Package, title: 'Deliver', when: 'Days 8–10', text: 'Shipped fully insured in a sealed case, with signature on delivery.' },
];

/** The making of a piece. Numbered because it is a real sequence; the rule fills with scroll. */
export function Atelier() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 55%'] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <section id="atelier" className="wrap section atelier" ref={ref} aria-labelledby="atelier-title">
      <div className="section__head">
        <div>
          <p className="eyebrow">From order to your door</p>
          <h2 id="atelier-title">Ten days, five hands, one piece.</h2>
        </div>
      </div>
      <div className="atelier__rule" aria-hidden>
        <motion.span style={{ scaleX: fill }} />
      </div>
      <ol className="atelier__steps">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ y: 24 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="atelier__num mono">{String(i + 1).padStart(2, '0')}</span>
            <s.icon size={34} weight="thin" className="atelier__icon" />
            <h3>{s.title}</h3>
            <p className="mono atelier__when">{s.when}</p>
            <p>{s.text}</p>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
