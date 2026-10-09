import type { Config, Product } from '../domain/types';
import { ProductScene, Stage } from './stage';

/**
 * Card and cart images. Each product configuration is rendered once with the shared
 * renderer, encoded to a blob URL and cached for the session. Requests are queued and
 * rendered one per idle slot so the page stays responsive while the grid fills in.
 */

const W = 640;
const H = 800;
const cache = new Map<string, Promise<string | null>>();
let queue: Promise<unknown> = Promise.resolve();
let scene: ProductScene | null = null;
let fontsReady: Promise<unknown> | null = null;

export function snapshotKey(p: Product, c: Config) {
  return [p.slug, c.color, c.karat, c.finish, c.variant, c.engraving.trim()].join('|');
}

const idle = () =>
  new Promise<void>((resolve) => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(() => resolve(), { timeout: 120 });
    else setTimeout(resolve, 16);
  });

export function snapshot(product: Product, config: Config): Promise<string | null> {
  const key = snapshotKey(product, config);
  const hit = cache.get(key);
  if (hit) return hit;
  const job = (queue = queue.then(() => render(product, config))) as Promise<string | null>;
  cache.set(key, job);
  return job;
}

async function render(product: Product, config: Config): Promise<string | null> {
  const stage = Stage.get();
  if (!stage) return null;
  fontsReady ??= document.fonts?.ready ?? Promise.resolve();
  await fontsReady;
  await idle();
  scene ??= new ProductScene(stage);
  scene.set(product, config);
  scene.fit(W / H, 1.04);
  scene.pivot.rotation.set(0, 0, 0);

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  stage.draw(scene.scene, scene.camera, W, H, ctx);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', 0.9));
  return blob ? URL.createObjectURL(blob) : null;
}
