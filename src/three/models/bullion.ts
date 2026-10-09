import * as THREE from 'three';
import { barStamp, faceEngraving, reedNormal, roundStamp, sunRelief } from '../textures';
import { Kit, type BuildOptions } from './kit';
import { roundedRect } from './parts';

function serialFor(label: string) {
  let h = 2166136261;
  for (const ch of label) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return 'AU' + (h >>> 0).toString().slice(0, 6);
}

/** Cast bar: rounded slab, stamped top face. */
export function bar(o: BuildOptions): Kit {
  const kit = new Kit();
  const w = 2.3 + 3.2 * o.scale;
  const h = w * 0.58;
  const depth = 0.1 + 0.36 * o.scale;
  const bevel = 0.07;
  const geo = new THREE.ExtrudeGeometry(roundedRect(w, h, 0.22), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 10,
  });
  geo.center();
  kit.goldMesh(geo);

  const face = new THREE.PlaneGeometry(w - 0.12, h - 0.12);
  face.translate(0, 0, depth / 2 + bevel + 0.002);
  kit.detail(face, 'bump', barStamp(o.variantLabel, serialFor(o.variantLabel), (w - 0.12) / (h - 0.12)), 2.2, { owned: true });

  kit.root.rotation.set(-0.55, 0.42, 0.06);
  return kit;
}

/** A coin body: edge band (optionally reeded), raised rims and two textured faces. */
function coinBody(
  kit: Kit,
  r: number,
  th: number,
  faces: { front: THREE.Texture; frontOwned: boolean; back: THREE.Texture; backEngrave?: (t: string) => THREE.Texture; amount: number },
  reeded: boolean,
) {
  const edge = new THREE.CylinderGeometry(r, r, th, 160, 1, true);
  edge.rotateX(Math.PI / 2);
  if (reeded) kit.detail(edge, 'normal', reedNormal(), 1);
  else kit.goldMesh(edge);

  for (const s of [1, -1]) {
    const rim = new THREE.TorusGeometry(r - 0.045, 0.05, 14, 160);
    rim.scale(1, 1, 0.8);
    rim.translate(0, 0, (s * th) / 2);
    kit.goldMesh(rim);
  }
  const front = new THREE.CircleGeometry(r - 0.05, 128);
  front.translate(0, 0, th / 2);
  kit.detail(front, 'bump', faces.front, faces.amount, { owned: faces.frontOwned });

  const back = new THREE.CircleGeometry(r - 0.05, 128);
  back.rotateY(Math.PI);
  back.translate(0, 0, -th / 2);
  kit.detail(back, 'bump', faces.back, faces.amount, { owned: true, engrave: faces.backEngrave });
}

export function round(o: BuildOptions): Kit {
  const kit = new Kit();
  const r = 1.1 + 0.55 * o.scale;
  const th = 0.14 + 0.1 * o.scale;
  coinBody(
    kit,
    r,
    th,
    { front: roundStamp(o.karat, o.variantLabel), frontOwned: true, back: roundStamp(o.karat, o.variantLabel), amount: 2.4 },
    true,
  );
  kit.root.rotation.set(-0.25, -0.55, 0);
  return kit;
}

export function coinPendant(o: BuildOptions): Kit {
  const kit = new Kit();
  const r = 0.9 + 0.32 * o.scale;
  const th = 0.17;
  coinBody(
    kit,
    r,
    th,
    {
      front: sunRelief(),
      frontOwned: false,
      back: faceEngraving(o.engraving, 'inscription'),
      backEngrave: (t) => faceEngraving(t, 'inscription'),
      amount: 2.2,
    },
    false,
  );
  const bail = new THREE.TorusGeometry(0.17, 0.05, 14, 48);
  bail.rotateY(Math.PI / 2);
  bail.translate(0, r + 0.2, 0);
  kit.goldMesh(bail);
  const jump = new THREE.TorusGeometry(0.09, 0.035, 12, 32);
  jump.translate(0, r + 0.02, 0);
  kit.goldMesh(jump);
  kit.root.rotation.set(-0.08, -0.42, 0.04);
  return kit;
}
