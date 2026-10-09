import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect } from 'react';
import { money } from '../../domain/format';

/** A USD amount that rolls to its new value instead of jumping. */
export function Money({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => money(Math.round(v)));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.7, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [mv, value]);
  return <motion.span className={['num', className].filter(Boolean).join(' ')}>{text}</motion.span>;
}
