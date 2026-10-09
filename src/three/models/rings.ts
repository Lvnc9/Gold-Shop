import * as THREE from 'three';
import { bandEngraving, faceEngraving } from '../textures';
import { Kit, type BuildOptions } from './kit';
import { bandGeometry, gemGeometry, rodGeometry } from './parts';

const R = 0.87; // inner radius in cm ≈ US size 7

/** Engraving liner: the inside wall of a band, rendered from within. */
export function engravedLiner(kit: Kit, r: number, w: number, text: string, opts: { oval?: number; engravable?: boolean } = {}) {
  const geo = new THREE.CylinderGeometry(r - 0.003, r - 0.003, w * 0.72, 160, 1, true);
  geo.rotateX(Math.PI / 2);
  geo.scale(opts.oval ?? 1, 1, 1);
  // Seen from inside the ring, so render the back faces.
  return kit.detail(geo, 'bump', bandEngraving(text), 1.6, {
    owned: true,
    engrave: opts.engravable === false ? undefined : bandEngraving,
    side: THREE.BackSide,
    // Text is centred on the bottom of the inside wall; look at it from above the front edge.
    anchor: { point: new THREE.Vector3(0, -r, 0), dir: new THREE.Vector3(0, 1.5, 1).normalize() },
  });
}

export function solitaire(o: BuildOptions): Kit {
  const kit = new Kit();
  const w = 0.17 + 0.06 * o.scale;
  const t = 0.14 + 0.03 * o.scale;
  kit.goldMesh(bandGeometry(R, w, t));
  engravedLiner(kit, R, w, o.engraving);

  const top = R + t;
  const gemR = 0.26;
  const gy = top + 0.3;
  const gem = kit.gem(gemGeometry(gemR));
  gem.position.set(0, gy, 0);

  const claws = new THREE.Group();
  kit.root.add(claws);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const base = new THREE.Vector3(Math.cos(a) * 0.08, top - 0.03, Math.sin(a) * 0.08);
    const tip = new THREE.Vector3(Math.cos(a) * (gemR * 0.92), gy + 0.08, Math.sin(a) * (gemR * 0.92));
    kit.goldMesh(rodGeometry(base, tip, 0.03), claws);
    const bead = kit.goldMesh(new THREE.SphereGeometry(0.036, 16, 12), claws);
    bead.position.copy(tip);
  }
  const basket = new THREE.TorusGeometry(gemR * 0.68, 0.022, 12, 48);
  basket.rotateX(Math.PI / 2);
  basket.translate(0, gy - 0.13, 0);
  kit.goldMesh(basket);
  const gallery = new THREE.TorusGeometry(0.1, 0.02, 12, 36);
  gallery.rotateX(Math.PI / 2);
  gallery.translate(0, top + 0.03, 0);
  kit.goldMesh(gallery);

  kit.root.rotation.set(0.32, -0.55, 0);
  return kit;
}

export function eternity(o: BuildOptions): Kit {
  const kit = new Kit();
  const w = 0.26, t = 0.19;
  kit.goldMesh(bandGeometry(R, w, t));
  engravedLiner(kit, R, w, o.engraving);

  const n = 22;
  const gemR = 0.095;
  const ring = R + t - 0.005;
  const gems = kit.gemInstanced(gemGeometry(gemR), n);
  const claws = kit.goldInstanced(new THREE.SphereGeometry(0.026, 12, 10), n * 2);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    q.setFromUnitVectors(up, dir);
    m.compose(dir.clone().multiplyScalar(ring + 0.03), q, new THREE.Vector3(1, 1, 1));
    gems.setMatrixAt(i, m);
    const b = a + Math.PI / n;
    for (let s = 0; s < 2; s++) {
      const p = new THREE.Vector3(Math.cos(b) * (ring + 0.05), Math.sin(b) * (ring + 0.05), (s ? 1 : -1) * (gemR * 0.85));
      m.makeTranslation(p.x, p.y, p.z);
      claws.setMatrixAt(i * 2 + s, m);
    }
  }
  kit.root.rotation.set(0.5, -0.65, 0);
  return kit;
}

export function signet(o: BuildOptions): Kit {
  const kit = new Kit();
  const w = 0.3, t = 0.2;
  kit.goldMesh(bandGeometry(R, w, t));

  const rx = 0.6 + 0.15 * o.scale;
  const rz = 0.5 + 0.1 * o.scale;
  const h = 0.38;
  const top = R + t + 0.16;
  const pedestal = new THREE.CylinderGeometry(1, 0.55, h, 96, 1);
  pedestal.scale(rx, 1, rz);
  pedestal.translate(0, top - h / 2, 0);
  kit.goldMesh(pedestal);

  const face = new THREE.CircleGeometry(1, 96);
  face.rotateX(-Math.PI / 2);
  face.scale(rx * 0.985, 1, rz * 0.985);
  face.translate(0, top + 0.002, 0);
  kit.detail(face, 'bump', faceEngraving(o.engraving, 'monogram'), 2.4, {
    owned: true,
    engrave: (text) => faceEngraving(text, 'monogram'),
    anchor: { point: new THREE.Vector3(0, top, 0), dir: new THREE.Vector3(0, 1, 0.3).normalize() },
  });

  kit.root.rotation.set(0.95, -0.35, 0);
  return kit;
}
