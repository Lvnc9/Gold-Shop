import { spotStore } from '../state/app';
import { getDb } from './runtime';

/**
 * The shop's spot price lives in DB doc `config/spot` ({ perGram, asOf }), written by the
 * owner (or by Claude via ArtifactData). The page cannot fetch market data itself (CSP),
 * so without that doc it keeps the built-in price from state/app.ts.
 */
let watching = false;
export async function watchSpot() {
  if (watching) return;
  watching = true;
  const db = await getDb();
  if (!db) return;
  db.doc('config/spot').onSnapshot(
    (snap) => {
      const d = snap.data();
      const perGram = Number(d?.perGram);
      const asOf = typeof d?.asOf === 'string' ? d.asOf : '';
      if (snap.exists && perGram > 20 && perGram < 2000 && /^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
        spotStore.set({ perGram, asOf, source: 'shop' });
      }
    },
    () => {
      /* not readable for this viewer: keep the built-in price */
    },
  );
}
