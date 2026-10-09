import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Kit, scaleUV, type BuildOptions } from './kit';
import { bandGeometry, gemGeometry, TILE } from './parts';
import { engravedLiner } from './rings';

/** Oval bangle with an engravable inner wall. */
export function bangle(o: BuildOptions): Kit {
  const kit = new Kit();
  const r = 2.9;
  const w = 0.3 + 0.22 * o.scale;
  const t = 0.2;
  const band = bandGeometry(r, w, t, 220);
  band.scale(1.12, 1, 1);
  kit.goldMesh(band);
  engravedLiner(kit, r, w, o.engraving, { oval: 1.12 });
  kit.root.rotation.set(-1.0, 0.25, 0.15);
  return kit;
}

/** Tennis bracelet: square settings, each with a brilliant, closed in a loop. */
export function tennis(_o: BuildOptions): Kit {
  const kit = new Kit();
  const n = 41;
  const size = 0.3;
  const settings = kit.goldInstanced(new RoundedBoxGeometry(size, 0.2, size * 0.92, 2, 0.045), n);
  const gems = kit.gemInstanced(gemGeometry(size * 0.38), n);
  const claws = kit.goldInstanced(new THREE.SphereGeometry(0.03, 10, 8), n * 4);
  const rx = 2.15, rz = 1.85;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = new THREE.Vector3(Math.cos(a) * rx, 0, Math.sin(a) * rz);
    const tangentAngle = Math.atan2(Math.cos(a) * rz, -Math.sin(a) * rx);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -tangentAngle);
    m.compose(p, q, one);
    settings.setMatrixAt(i, m);
    m.compose(p.clone().setY(0.17), q, one);
    gems.setMatrixAt(i, m);
    for (let c = 0; c < 4; c++) {
      const ca = (c / 4) * Math.PI * 2 + Math.PI / 4;
      const local = new THREE.Vector3(Math.cos(ca) * size * 0.4, 0.13, Math.sin(ca) * size * 0.4).applyQuaternion(q);
      m.makeTranslation(p.x + local.x, local.y, p.z + local.z);
      claws.setMatrixAt(i * 4 + c, m);
    }
  }
  kit.root.rotation.set(0.62, 0.3, 0);
  return kit;
}

/** A pair of tube hoops with hinged posts. */
export function hoops(o: BuildOptions): Kit {
  const kit = new Kit();
  const R = 0.6 + 1.5 * o.scale;
  const tube = 0.15;
  const arc = Math.PI * 2 * 0.94;
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group();
    const geo = new THREE.TorusGeometry(R, tube, 28, 180, arc);
    geo.rotateZ(Math.PI / 2 + (Math.PI * 2 - arc) / 2);
    scaleUV(geo, (Math.PI * 2 * R) / TILE, (Math.PI * 2 * tube) / TILE);
    kit.goldMesh(geo, g);
    const post = new THREE.CylinderGeometry(0.028, 0.028, 0.55, 12);
    post.rotateX(Math.PI / 2);
    post.translate(0, R, 0.05);
    kit.goldMesh(post, g);
    g.position.set(i ? R * 0.62 : -R * 0.62, i ? -R * 0.12 : 0, i ? -R * 0.5 : 0);
    g.rotation.set(0, i ? -0.55 : 0.45, i ? 0.08 : -0.05);
    kit.root.add(g);
  }
  kit.root.rotation.set(0.08, 0, 0);
  return kit;
}
