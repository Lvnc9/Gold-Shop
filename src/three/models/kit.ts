import * as THREE from 'three';
import { diamondMaterial, withBump, withNormal } from '../materials';

export interface BuildOptions {
  /** 0..1 thickness/size hint from the product variant. */
  scale: number;
  engraving: string;
  variantLabel: string;
  karat: number;
}

interface DetailPart {
  mesh: THREE.Mesh;
  kind: 'bump' | 'normal';
  tex: THREE.Texture;
  amount: number;
  side: THREE.Side;
  /** Where the engraving sits (mesh-local point) and the direction to look at it from. */
  anchor?: { point: THREE.Vector3; dir: THREE.Vector3 };
  /** Rebuilds the texture for a new engraving text. */
  engrave?: (text: string) => THREE.Texture;
}

/**
 * Collects the meshes of one procedural model so the material, engraving and
 * GPU resources can be managed in one place. Shared materials/textures from
 * materials.ts and textures.ts are never disposed here.
 */
export class Kit {
  readonly root = new THREE.Group();
  private gold: THREE.Mesh[] = [];
  private details: DetailPart[] = [];
  private geometries = new Set<THREE.BufferGeometry>();
  private ownedTextures = new Set<THREE.Texture>();
  private base?: THREE.MeshPhysicalMaterial;
  private placeholder = new THREE.MeshPhysicalMaterial({ color: 0xd6a640, metalness: 1, roughness: 0.2 });

  private track<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.add(g);
    return g;
  }

  goldMesh(geo: THREE.BufferGeometry, parent: THREE.Object3D = this.root): THREE.Mesh {
    const m = new THREE.Mesh(this.track(geo), this.base ?? this.placeholder);
    parent.add(m);
    this.gold.push(m);
    return m;
  }

  goldInstanced(geo: THREE.BufferGeometry, count: number, parent: THREE.Object3D = this.root): THREE.InstancedMesh {
    const m = new THREE.InstancedMesh(this.track(geo), this.base ?? this.placeholder, count);
    parent.add(m);
    this.gold.push(m);
    return m;
  }

  gem(geo: THREE.BufferGeometry, parent: THREE.Object3D = this.root): THREE.Mesh {
    const m = new THREE.Mesh(this.track(geo), diamondMaterial());
    parent.add(m);
    return m;
  }

  gemInstanced(geo: THREE.BufferGeometry, count: number, parent: THREE.Object3D = this.root): THREE.InstancedMesh {
    const m = new THREE.InstancedMesh(this.track(geo), diamondMaterial(), count);
    parent.add(m);
    return m;
  }

  /** A gold mesh carrying its own relief (bump) or surface (normal) texture. */
  detail(
    geo: THREE.BufferGeometry,
    kind: 'bump' | 'normal',
    tex: THREE.Texture,
    amount: number,
    opts: {
      owned?: boolean;
      engrave?: (text: string) => THREE.Texture;
      parent?: THREE.Object3D;
      side?: THREE.Side;
      anchor?: { point: THREE.Vector3; dir: THREE.Vector3 };
    } = {},
  ): THREE.Mesh {
    const m = new THREE.Mesh(this.track(geo), this.placeholder);
    (opts.parent ?? this.root).add(m);
    if (opts.owned) this.ownedTextures.add(tex);
    this.details.push({ mesh: m, kind, tex, amount, side: opts.side ?? THREE.FrontSide, engrave: opts.engrave, anchor: opts.anchor });
    return m;
  }

  get engravable(): boolean {
    return this.details.some((d) => d.engrave);
  }

  /** World-space point of the engraving and a unit direction to view it from. */
  engravingAnchor(): { point: THREE.Vector3; dir: THREE.Vector3 } | null {
    const d = this.details.find((x) => x.engrave && x.anchor);
    if (!d?.anchor) return null;
    d.mesh.updateWorldMatrix(true, false);
    return {
      point: d.mesh.localToWorld(d.anchor.point.clone()),
      dir: d.anchor.dir.clone().transformDirection(d.mesh.matrixWorld),
    };
  }

  setGold(mat: THREE.MeshPhysicalMaterial) {
    this.base = mat;
    for (const m of this.gold) m.material = mat;
    for (const d of this.details) this.applyDetail(d);
  }

  setEngraving(text: string) {
    for (const d of this.details) {
      if (!d.engrave) continue;
      this.ownedTextures.delete(d.tex);
      d.tex.dispose();
      d.tex = d.engrave(text);
      this.ownedTextures.add(d.tex);
      this.applyDetail(d);
    }
  }

  private applyDetail(d: DetailPart) {
    if (!this.base) return;
    const prev = d.mesh.material as THREE.Material;
    if (prev !== this.placeholder && !prev.userData.shared) prev.dispose();
    const m = d.kind === 'bump' ? withBump(this.base, d.tex, d.amount) : withNormal(this.base, d.tex, d.amount);
    m.side = d.side;
    d.mesh.material = m;
  }

  dispose() {
    this.geometries.forEach((g) => g.dispose());
    this.ownedTextures.forEach((t) => t.dispose());
    for (const d of this.details) {
      const m = d.mesh.material as THREE.Material;
      if (!m.userData.shared) m.dispose();
    }
    this.placeholder.dispose();
    this.root.removeFromParent();
  }
}

/** Scales UVs so a tiling texture keeps a physical size (≈ `tile` cm) on any surface. */
export function scaleUV(geo: THREE.BufferGeometry, su: number, sv: number): THREE.BufferGeometry {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return geo;
}
