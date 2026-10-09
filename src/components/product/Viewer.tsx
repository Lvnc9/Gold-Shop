import { ArrowCounterClockwise, Eye, HandGrabbing, MagnifyingGlassMinus, MagnifyingGlassPlus, Pause, Play } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Config, Product } from '../../domain/types';
import { useLiveView } from '../../hooks/useLiveView';
import { reducedMotion } from '../../motion/smooth';
import { ProductImage } from '../ui/ProductImage';

/** The product's live 3D view with its toolbar. */
export function Viewer({ product, config }: { product: Product; config: Config }) {
  const { canvasRef, view, supported } = useLiveView(product, config, { controls: true, autoRotate: true, margin: 0.9 });
  const [spinning, setSpinning] = useState(!reducedMotion());
  const [touched, setTouched] = useState(false);
  const prev = useRef(config);

  // A small turn when the metal changes, so the new colour catches the light.
  useEffect(() => {
    const p = prev.current;
    if (p.color !== config.color || p.karat !== config.karat || p.finish !== config.finish) view?.flick(2.4);
    prev.current = config;
  }, [config, view]);

  const toggleSpin = () => {
    if (!view) return;
    view.autoRotate = !spinning;
    setSpinning(!spinning);
  };
  const canPeek = !!product.engraving && product.engraving.where !== 'on the face';

  if (!supported) {
    return (
      <div className="viewer">
        <ProductImage product={product} config={config} className="viewer__still" />
        <p className="viewer__hint">3D is unavailable in this browser, so you are seeing a still render.</p>
      </div>
    );
  }

  return (
    <motion.div className="viewer velvet" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
      <div className="viewer__halo" aria-hidden />
      <canvas
        ref={canvasRef}
        className="viewer__canvas"
        aria-label={`${product.name}: drag to turn the 3D model`}
        onPointerDown={() => {
          setTouched(true);
          setSpinning(false);
        }}
      />
      <motion.p className="viewer__hint" animate={{ opacity: touched ? 0 : 1 }}>
        <HandGrabbing size={16} /> Drag to turn
      </motion.p>
      <div className="viewer__tools" role="toolbar" aria-label="3D view">
        <button className="tool" onClick={() => view?.zoom(0.8)} aria-label="Zoom in">
          <MagnifyingGlassPlus size={18} />
        </button>
        <button className="tool" onClick={() => view?.zoom(1.25)} aria-label="Zoom out">
          <MagnifyingGlassMinus size={18} />
        </button>
        <button className="tool" onClick={toggleSpin} aria-label={spinning ? 'Stop turning' : 'Turn slowly'} aria-pressed={spinning}>
          {spinning ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          className="tool"
          onClick={() => {
            view?.reset();
          }}
          aria-label="Reset view"
        >
          <ArrowCounterClockwise size={18} />
        </button>
        {canPeek && (
          <button
            className="tool tool--wide"
            onClick={() => {
              view?.showInside();
              setSpinning(false);
            }}
          >
            <Eye size={18} /> See engraving
          </button>
        )}
      </div>
    </motion.div>
  );
}
