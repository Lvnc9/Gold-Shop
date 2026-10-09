import * as THREE from 'three';
import { chevronNormal } from '../textures';
import { Kit, type BuildOptions } from './kit';
import { drapeCurve, faceFrame } from './parts';

/** Cuban: flattened oval links, alternately twisted about the chain's axis. */
export function cuban(o: BuildOptions): Kit {
  const kit = new Kit();
  const curve = drapeCurve(1.75, 2.3);
  const linkR = 0.075 + 0.04 * o.scale;
  const tube = linkR * 0.42;
  const spacing = linkR * 1.25;
  const count = Math.floor(curve.getLength() / spacing);
  const links = kit.goldInstanced(new THREE.TorusGeometry(linkR, tube, 12, 32), count);

  const basis = new THREE.Matrix4();
  const twist = new THREE.Matrix4();
  const scale = new THREE.Matrix4().makeScale(1.45, 1, 0.62);
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const f = faceFrame(curve, (i + 0.5) / count);
    basis.makeBasis(f.T, f.Y, f.Z).setPosition(f.P);
    twist.makeRotationX(i % 2 ? 0.62 : -0.62);
    m.copy(basis).multiply(twist).multiply(scale);
    links.setMatrixAt(i, m);
  }
  links.instanceMatrix.needsUpdate = true;
  kit.root.rotation.set(-0.15, 0, 0);
  return kit;
}

/** A helix around a base curve, in the chain's face frame. */
class StrandCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private base: THREE.Curve<THREE.Vector3>,
    private radius: number,
    private turns: number,
    private phase: number,
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const f = faceFrame(this.base, Math.min(Math.max(t, 0), 1));
    const a = t * this.turns * Math.PI * 2 + this.phase;
    return target
      .copy(f.P)
      .addScaledVector(f.Y, Math.cos(a) * this.radius)
      .addScaledVector(f.Z, Math.sin(a) * this.radius);
  }
}

/** Rope: three strands spun around one another. */
export function rope(o: BuildOptions): Kit {
  const kit = new Kit();
  const curve = drapeCurve(1.75, 2.3);
  const r = 0.04 + 0.025 * o.scale;
  const turns = curve.getLength() / (r * 4.2);
  for (let i = 0; i < 3; i++) {
    const strand = new StrandCurve(curve, r * 0.62, turns, (i / 3) * Math.PI * 2);
    kit.goldMesh(new THREE.TubeGeometry(strand, 1400, r * 0.62, 10, false));
  }
  kit.root.rotation.set(-0.15, 0, 0);
  return kit;
}

/** Herringbone: a flat ribbon carrying a chevron normal map. */
export function herringbone(o: BuildOptions): Kit {
  const kit = new Kit();
  const curve = drapeCurve(1.6, 2.1);
  const width = 0.2 + 0.14 * o.scale;
  const thick = 0.03;
  const steps = 480;
  const length = curve.getLength();

  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const corner = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const f = faceFrame(curve, u);
    const along = (u * length) / (width * 0.9);
    // top surface (+Z) then bottom surface (-Z)
    for (const side of [1, -1]) {
      for (const edge of [-1, 1]) {
        corner.copy(f.P).addScaledVector(f.Y, (edge * width) / 2).addScaledVector(f.Z, (side * thick) / 2);
        pos.push(corner.x, corner.y, corner.z);
        uv.push(along, edge < 0 ? 0 : 1);
      }
    }
  }
  for (let i = 0; i < steps; i++) {
    const a = i * 4, b = (i + 1) * 4;
    idx.push(a, a + 1, b, a + 1, b + 1, b); // top
    idx.push(a + 2, b + 2, a + 3, a + 3, b + 2, b + 3); // bottom
    idx.push(a, b, a + 2, a + 2, b, b + 2); // edge −
    idx.push(a + 1, a + 3, b + 1, a + 3, b + 3, b + 1); // edge +
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  kit.detail(geo, 'normal', chevronNormal(), 0.9, { side: THREE.DoubleSide });
  kit.root.rotation.set(-0.2, 0, 0);
  return kit;
}
