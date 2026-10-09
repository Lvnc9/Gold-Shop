import { CheckCircle, Copy, Handbag, Heart } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { uiStore } from '../../state/app';
import { useStore } from '../../state/store';

const ICONS = { bag: Handbag, heart: Heart, check: CheckCircle, copy: Copy };

export function Toast() {
  const { toast } = useStore(uiStore);
  const Icon = toast?.icon ? ICONS[toast.icon] : CheckCircle;
  return (
    <div className="toast-dock" role="status" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="toast"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <Icon size={18} weight="duotone" />
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
