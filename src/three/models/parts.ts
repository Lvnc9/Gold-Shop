import * as THREE from 'three';
import { scaleUV } from './kit';

const TILE = 0.45; // cm per texture tile for finishes

/**
 * A ring band: a rounded cross-section swept around the Z axis (ring faces the camera).
 * r = inner radius, w = width (along Z), t = thickness (radial).
 */
export function bandGeometry(r: number, w: number, t: number, segments = 160): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 48;
  const p = 0.55; // superellipse exponent: lower = squarer
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const x = r + t / 2 + (t / 2) * Math.sign(c) * Math.abs(c) ** p;
    const y = (w / 2) * Math.sign(s) * Math.abs(s) ** p;
    pts.push(new THREE.Vector2(x, y));
  }
  pts.reverse(); // outward-facing winding for LatheGeometry
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.rotateX(Math.PI / 2);
  const circumference = Math.PI * 2 * (r + t);
  return scaleUV(geo, circumference / TILE, (2 * (w + t)) / TILE);
}

/** Round brilliant: crown + pavilion, faceted by flat shading. Table faces +Y. */
export function gemGeometry(r: number): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.0001, -0.86 * r),
    new THREE.Vector2(r, -0.02 * r),
    new THREE.Vector2(r, 0.04 * r),
    new THREE.Vector2(0.58 * r, 0.34 * r),
    new THREE.Vector2(0.0001, 0.34 * r),
  ];
  return new THREE.LatheGeometry(pts, 16);
}

/** A cylinder spanning two points. */
export function rodGeometry(a: THREE.Vector3, b: THREE.Vector3, radius: number): THREE.BufferGeometry {
  const len = a.distanceTo(b);
  const geo = new THREE.CylinderGeometry(radius, radius * 0.9, len, 12, 1);
  geo.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  geo.applyQuaternion(q);
  geo.translate(a.x, a.y, a.z);
  return geo;
}

/** The drape of a necklace seen from the front: a soft U in the XY plane, dipping toward the camera. */
export function drapeCurve(halfWidth: number, drop: number): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) {
    const s = (i / 16) * 2 - 1;
    const y = drop * (Math.abs(s) ** 1.7) - drop * 0.55;
    const x = halfWidth * Math.sin((s * Math.PI) / 2.2);
    const z = 0.35 * (1 - s * s);
    pts.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
}

/**
 * Frame along a curve that keeps the "face" of a chain toward the camera:
 * x = tangent, z = toward camera (projected), y = in-plane side.
 */
export function faceFrame(curve: THREE.Curve<THREE.Vector3>, u: number) {
  const T = curve.getTangentAt(u).normalize();
  const view = new THREE.Vector3(0, 0, 1);
  const Z = view.sub(T.clone().multiplyScalar(view.dot(T))).normalize();
  const Y = new THREE.Vector3().crossVectors(Z, T).normalize();
  return { T, Y, Z, P: curve.getPointAt(u) };
}

/** Rounded rectangle shape centred on the origin. */
export function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export { TILE };
