import { Diamond } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import type { Config, Product } from '../../domain/types';
import { useSnapshot } from '../../hooks/useSnapshot';

/** Velvet tile with the rendered piece; shimmers while the render is queued. */
export function ProductImage({ product, config, className }: { product: Product; config: Config; className?: string }) {
  const url = useSnapshot(product, config);
  return (
    <div className={['pimg', 'velvet', className].filter(Boolean).join(' ')}>
      <AnimatePresence mode="popLayout" initial={false}>
        {url ? (
          <motion.img
            key={url}
            src={url}
            alt={`${product.name}, rendered in ${config.karat}k ${config.color} gold`}
            initial={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            draggable={false}
          />
        ) : (
          <motion.div key="wait" className="pimg__wait skeleton" exit={{ opacity: 0 }}>
            <Diamond size={28} weight="thin" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
