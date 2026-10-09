import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Config, Product } from '../domain/types';
import { goldMaterial } from './materials';
import { geometryKey, MODELS, type Kit } from './models';

/**
 * One WebGL renderer for the whole site. Every visible 3D view (hero, configurator,
 * product page) and every card snapshot is rendered by it and copied into the view's
 * own 2D canvas, so the page never holds more than one GL context.
 */
export class Stage {
  private static instance: Stage | null | undefined;
  readonly renderer: THREE.WebGLRenderer;
  readonly env: THREE.Texture;
  private views = new Set<LiveView>();
  private raf = 0;
  private last = 0;

  static get(): Stage | null {
    if (Stage.instance !== undefined) return Stage.instance;
    try {
      Stage.instance = new Stage();
    } catch (err) {
      console.warn('WebGL unavailable, showing static fallbacks.', err);
      Stage.instance = null;
    }
    return Stage.instance;
  }

  private constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1); // views manage device pixels themselves
    this.renderer.setSize(8, 8, false);
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.env = pmrem.fromScene(studio(), 0.03).texture;
    pmrem.dispose();
  }

  private ensureSize(w: number, h: number) {
    const c = this.renderer.domElement;
    if (c.width >= w && c.height >= h) return;
    this.renderer.setSize(Math.max(c.width, w), Math.max(c.height, h), false);
  }

  /** Renders a scene into the bottom-left w×h of the GL canvas and copies it into ctx. */
  draw(scene: THREE.Scene, camera: THREE.Camera, w: number, h: number, ctx: CanvasRenderingContext2D) {
    if (w < 2 || h < 2) return;
    this.ensureSize(w, h);
    const gl = this.renderer.domElement;
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissor(0, 0, w, h);
    this.renderer.setScissorTest(true);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(gl, 0, gl.height - h, w, h, 0, 0, w, h);
  }

  add(view: LiveView) {
    this.views.add(view);
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  remove(view: LiveView) {
    this.views.delete(view);
  }

  private loop = (now: number) => {
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    for (const v of this.views) if (v.visible) v.frame(dt);
    this.raf = this.views.size ? requestAnimationFrame(this.loop) : 0;
  };
}

/**
 * A jewellery-photography light box: a dark room with an overhead softbox, two tall
 * strip lights and a warm fill card. Metals reflect these panels as crisp highlights
 * against dark, which reads as polished gold far better than an even grey room.
 */
function studio(): THREE.Scene {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(12, 12, 12),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2a2620), side: THREE.BackSide }),
  );
  scene.add(room);
  const panel = (w: number, h: number, intensity: number, color: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(7, 3, 9, 0xffffff, 0, 5.6, 0.8); // overhead softbox
  panel(1.4, 7, 6, 0xfff3e2, -5.6, 0.6, 1.4); // left strip
  panel(1.4, 7, 6, 0xfff3e2, 5.6, 0.6, 1.4); // right strip
  panel(6, 3.2, 2.2, 0xffe0b0, 0, -0.4, 5.6); // warm fill behind camera
  panel(3, 5, 3, 0xffffff, -3.5, 1.5, -4.6); // back kicker
  panel(10, 3, 0.9, 0xd49a4a, 0, -5.6, 0); // warm floor bounce
  return scene;
}

/** A product model in a lit scene with a camera that frames it. */
export class ProductScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(26, 1, 0.05, 200);
  readonly pivot = new THREE.Group();
  private kit?: Kit;
  private geoKey = '';
  private matKey = '';
  private engraving = '';
  radius = 1;
  distance = 5;
  /** Half extents of the framed model. */
  private half = new THREE.Vector3(1, 1, 1);
  /** 'box' frames the model as posed; 'spin' leaves room for a turntable rotation. */
  fitMode: 'box' | 'spin' = 'box';

  constructor(stage: Stage) {
    this.scene.environment = stage.env;
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 5, 4);
    const rim = new THREE.DirectionalLight(0xffe2b0, 1.1);
    rim.position.set(-4, 1.5, -3);
    this.scene.add(key, rim, this.pivot);
  }

  get engravable() {
    return this.kit?.engravable ?? false;
  }

  set(product: Product, config: Config) {
    const variant = product.variants[config.variant] ?? product.variants[0];
    const gk = geometryKey(product.model, config.variant, config.karat);
    if (gk !== this.geoKey) {
      this.kit?.dispose();
      this.kit = MODELS[product.model]({
        scale: variant.scale,
        engraving: config.engraving,
        variantLabel: variant.label,
        karat: config.karat,
      });
      this.pivot.add(this.kit.root);
      this.geoKey = gk;
      this.matKey = '';
      this.engraving = config.engraving;
      this.frame();
    }
    const mk = `${config.color}|${config.karat}|${config.finish}`;
    if (mk !== this.matKey) {
      this.kit!.setGold(goldMaterial(config.color, config.karat, config.finish));
      this.matKey = mk;
    }
    if (config.engraving !== this.engraving) {
      this.kit!.setEngraving(config.engraving);
      this.engraving = config.engraving;
    }
  }

  /** Centres the model on the pivot and pulls the camera back to fit it. */
  private frame() {
    const root = this.kit!.root;
    root.position.set(0, 0, 0);
    this.pivot.rotation.set(0, 0, 0);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    root.position.sub(box.getCenter(new THREE.Vector3()));
    box.getSize(this.half).multiplyScalar(0.5);
    this.radius = sphere.radius;
    this.fit(this.camera.aspect);
  }

  fit(aspect: number, margin = 1.08) {
    this.camera.aspect = aspect;
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const { x, y, z } = this.half;
    const w = this.fitMode === 'spin' ? Math.hypot(x, z) : x;
    const d = this.fitMode === 'spin' ? w : z;
    this.distance = Math.max(y / Math.tan(vfov / 2), w / Math.tan(hfov / 2)) * margin + d;
    this.camera.position.set(0, 0, this.distance);
    this.camera.near = this.distance / 50;
    this.camera.far = this.distance * 10;
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.kit?.dispose();
    this.kit = undefined;
    this.geoKey = '';
  }
}

export interface LiveViewOptions {
  /** Drag to rotate, wheel/pinch to zoom. */
  controls?: boolean;
  /** Slow turntable spin. Disabled under reduced motion. */
  autoRotate?: boolean;
  /** Tilt toward the pointer (hero). */
  parallax?: boolean;
  margin?: number;
}

/** A live, on-screen product view bound to one 2D canvas. */
export class LiveView {
  readonly ps: ProductScene;
  visible = false;
  autoRotate: boolean;
  private ctx: CanvasRenderingContext2D;
  private controls?: OrbitControls;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private w = 0;
  private h = 0;
  private pointer = new THREE.Vector2();
  private tilt = new THREE.Vector2();
  private spin = 0;
  private zoomTo = 0;
  private clock = 0;
  private swayBase = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private onPointer = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  };

  constructor(
    private stage: Stage,
    readonly canvas: HTMLCanvasElement,
    private opts: LiveViewOptions = {},
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.ps = new ProductScene(stage);
    this.ps.fitMode = opts.autoRotate || opts.controls ? 'spin' : 'box';
    this.autoRotate = !!opts.autoRotate && !this.reduced;
    if (opts.controls) {
      this.controls = new OrbitControls(this.ps.camera, canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.enablePan = false;
      this.controls.rotateSpeed = 0.8;
      this.controls.enableZoom = false; // wheel scrolls the page; zoom is on buttons

      this.controls.addEventListener('start', () => (this.autoRotate = false));
    }
    if (opts.parallax) window.addEventListener('pointermove', this.onPointer, { passive: true });
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.io = new IntersectionObserver(([e]) => (this.visible = e.isIntersecting), { rootMargin: '80px' });
    this.io.observe(canvas);
    this.resize();
    stage.add(this);
  }

  set(product: Product, config: Config) {
    const before = this.ps.radius;
    this.ps.set(product, config);
    if (this.ps.radius !== before) {
      this.ps.pivot.rotation.set(0, 0, 0);
      this.swayBase = 0;
      this.clock = 0;
      this.refit();
    }
  }

  /** Puts the camera back to the framed default. */
  reset() {
    this.zoomTo = 0;
    this.swayBase = 0;
    this.clock = 0;
    this.ps.pivot.rotation.set(0, 0, 0);
    this.refit();
  }

  /** Eases the camera closer (f < 1) or further (f > 1), within limits. */
  zoom(f: number) {
    const cur = this.zoomTo || this.ps.camera.position.length();
    this.zoomTo = THREE.MathUtils.clamp(cur * f, this.ps.distance * 0.4, this.ps.distance * 1.6);
  }

  /** Swings the camera to look into the band so the engraving is readable. */
  showInside() {
    this.autoRotate = false;
    this.zoomTo = 0;
    this.ps.pivot.rotation.set(0, 0, 0);
    const d = this.ps.distance * 0.55;
    this.ps.camera.position.set(0, -d * 0.15, -d);
    this.ps.camera.lookAt(0, 0, 0);
    this.controls?.target.set(0, 0, 0);
    this.controls?.update();
  }

  private refit() {
    this.ps.fit(this.w / Math.max(this.h, 1), this.opts.margin);
    if (this.controls) {
      this.controls.target.set(0, 0, 0);
      this.controls.minDistance = this.ps.distance * 0.45;
      this.controls.maxDistance = this.ps.distance * 1.8;
      this.controls.update();
    }
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(this.canvas.clientWidth * dpr);
    const h = Math.round(this.canvas.clientHeight * dpr);
    if (!w || !h || (w === this.w && h === this.h)) return;
    this.w = this.canvas.width = w;
    this.h = this.canvas.height = h;
    this.refit();
  }

  frame(dt: number) {
    // Auto motion is a slow sway rather than a full turn, so chains never show their edge.
    if (this.autoRotate) {
      this.clock += dt;
      this.ps.pivot.rotation.y = this.swayBase + Math.sin(this.clock * 0.45) * 0.55;
    } else {
      this.swayBase = this.ps.pivot.rotation.y;
      this.clock = 0;
    }
    if (this.spin) {
      this.swayBase += this.spin * dt;
      if (!this.autoRotate) this.ps.pivot.rotation.y += this.spin * dt;
      this.spin *= 0.94;
      if (Math.abs(this.spin) < 0.01) this.spin = 0;
    }
    if (this.opts.parallax && !this.reduced) {
      this.tilt.lerp(this.pointer, 0.05);
      this.ps.pivot.rotation.x = this.tilt.y * 0.18;
      this.ps.pivot.position.x = this.tilt.x * this.ps.radius * 0.04;
    }
    if (this.zoomTo) {
      const p = this.ps.camera.position;
      const len = THREE.MathUtils.lerp(p.length(), this.zoomTo, 0.12);
      p.setLength(len);
      if (Math.abs(len - this.zoomTo) < this.ps.distance * 0.002) this.zoomTo = 0;
    }
    this.controls?.update();
    this.stage.draw(this.ps.scene, this.ps.camera, this.w, this.h, this.ctx);
  }

  /** A quick flourish, e.g. when the configuration changes. */
  flick(speed = 4) {
    if (!this.reduced) this.spin = speed;
  }

  destroy() {
    this.stage.remove(this);
    this.ro.disconnect();
    this.io.disconnect();
    this.controls?.dispose();
    window.removeEventListener('pointermove', this.onPointer);
    this.ps.dispose();
  }
}
