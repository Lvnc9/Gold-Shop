import { useEffect, useState } from 'react';
import type { Config, Product } from '../domain/types';
import { snapshot, snapshotKey } from '../three/snapshots';

/** Blob URL of a rendered product image, or null while it renders (or without WebGL). */
export function useSnapshot(product: Product | undefined, config: Config | undefined): string | null {
  const key = product && config ? snapshotKey(product, config) : '';
  const [state, setState] = useState<{ key: string; url: string | null }>({ key: '', url: null });
  useEffect(() => {
    if (!product || !config) return;
    let live = true;
    snapshot(product, config).then((url) => live && setState({ key, url }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? state.url : null;
}
