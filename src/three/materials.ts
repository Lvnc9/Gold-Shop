import * as THREE from 'three';
import type { Finish, Karat, MetalColor } from '../domain/types';
import { brushedNormal, hammeredNormal } from './textures';

/**
 * Base colours (sRGB) per alloy. Lower karats are paler; 24k exists only in yellow.
 * Tuned by eye under RoomEnvironment + Neutral tone mapping.
 */
const ALLOY: Record<MetalColor, Partial<Record<Karat, string>>> = {
  yellow: { 24: '#ffc85a', 22: '#fcca6c', 18: '#f2c97e', 14: '#e8c78e' },
  rose: { 22: '#f3ad85', 18: '#eeac8f', 14: '#e8ae98' },
  white: { 22: '#e9e5da', 18: '#e6e4de', 14: '#e1dfd9' },
};

/** CSS swatch for UI, matching the rendered alloy. */
export function alloySwatch(color: MetalColor, karat: Karat): string {
  return ALLOY[color][karat] ?? ALLOY[color][18]!;
}

const cache = new Map<string, THREE.MeshPhysicalMaterial>();

export function goldMaterial(color: MetalColor, karat: Karat, finish: Finish): THREE.MeshPhysicalMaterial {
  const key = `${color}|${karat}|${finish}`;
  let m = cache.get(key);
  if (m) return m;
  m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(alloySwatch(color, karat)),
    metalness: 1,
    roughness: finish === 'polished' ? 0.13 : finish === 'satin' ? 0.34 : 0.2,
    envMapIntensity: 1.15,
    // White gold is rhodium plated: a faint clearcoat gives it the brighter skin.
    clearcoat: color === 'white' ? 0.35 : 0,
    clearcoatRoughness: 0.08,
  });
  if (finish === 'hammered') {
    m.normalMap = hammeredNormal();
    m.normalScale.set(0.55, 0.55);
  } else if (finish === 'satin') {
    m.normalMap = brushedNormal();
    m.normalScale.set(0.12, 0.12);
  }
  m.userData.shared = true;
  cache.set(key, m);
  return m;
}

let gem: THREE.MeshPhysicalMaterial | undefined;
export function diamondMaterial(): THREE.MeshPhysicalMaterial {
  if (gem) return gem;
  gem = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    thickness: 0.4,
    ior: 2.42,
    dispersion: 4,
    specularIntensity: 1,
    envMapIntensity: 2.4,
    flatShading: true,
  });
  gem.userData.shared = true;
  return gem;
}

/** A per-mesh copy of a shared gold material that carries an engraving/relief bump map. */
export function withBump(base: THREE.MeshPhysicalMaterial, bump: THREE.Texture, scale: number): THREE.MeshPhysicalMaterial {
  const m = base.clone();
  m.bumpMap = bump;
  m.bumpScale = scale;
  m.normalMap = null; // the relief reads better on a smooth field
  m.userData.shared = false;
  return m;
}

/** Same, but with a dedicated normal map (e.g. coin reeding). */
export function withNormal(base: THREE.MeshPhysicalMaterial, normal: THREE.Texture, scale: number): THREE.MeshPhysicalMaterial {
  const m = base.clone();
  m.normalMap = normal;
  m.normalScale.set(scale, scale);
  m.userData.shared = false;
  return m;
}
