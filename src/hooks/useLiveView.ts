import { useEffect, useRef, useState } from 'react';
import type { Config, Product } from '../domain/types';
import { LiveView, Stage, type LiveViewOptions } from '../three/stage';

/**
 * Binds a LiveView to a canvas for the component's lifetime and keeps it in sync
 * with the product + config. Returns the view (null until mounted or without WebGL).
 */
export function useLiveView(product: Product, config: Config, opts: LiveViewOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<LiveView | null>(null);
  const [supported] = useState(() => Stage.get() !== null);

  useEffect(() => {
    const stage = Stage.get();
    if (!stage || !canvasRef.current) return;
    const v = new LiveView(stage, canvasRef.current, opts);
    setView(v);
    return () => {
      v.destroy();
      setView(null);
    };
    // options are fixed for the life of the view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    view?.set(product, config);
  }, [view, product, config]);

  return { canvasRef, view, supported };
}
