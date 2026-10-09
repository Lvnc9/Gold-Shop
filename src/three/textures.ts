import * as THREE from 'three';

/** Procedural textures: everything is drawn on canvases, nothing is fetched. */

const ENGRAVE_FONT = '"Bodoni Moda", "Didot", "Times New Roman", serif';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Converts a height field (0..1, row-major, tileable) to a tangent-space normal map. */
function heightToNormal(height: Float32Array, w: number, h: number, strength: number): THREE.DataTexture {
  const data = new Uint8Array(w * h * 4);
  const at = (x: number, y: number) => height[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

let hammered: THREE.Texture | undefined;
/** Overlapping shallow dents, as left by a planishing hammer. */
export function hammeredNormal(): THREE.Texture {
  if (hammered) return hammered;
  const w = 256, h = 256;
  const height = new Float32Array(w * h).fill(1);
  const rnd = seeded(7);
  for (let n = 0; n < 150; n++) {
    const cx = rnd() * w, cy = rnd() * h, r = 12 + rnd() * 16;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2;
        if (d2 > r * r) continue;
        const i = ((y + h) % h) * w + ((x + w) % w);
        const depth = 1 - Math.sqrt(r * r - d2) / r;
        height[i] = Math.min(height[i], 0.2 + depth * 0.8);
      }
    }
  }
  return (hammered = heightToNormal(height, w, h, 1.6));
}

let brushed: THREE.Texture | undefined;
/** Fine parallel streaks of a satin finish. */
export function brushedNormal(): THREE.Texture {
  if (brushed) return brushed;
  const w = 256, h = 256;
  const height = new Float32Array(w * h);
  const rnd = seeded(11);
  const rows = Array.from({ length: h }, () => rnd());
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) height[y * w + x] = rows[y] * 0.7 + rnd() * 0.08;
  return (brushed = heightToNormal(height, w, h, 1.1));
}

let chevron: THREE.Texture | undefined;
/** Herringbone weave: slanted ridges that flip direction across the width. */
export function chevronNormal(): THREE.Texture {
  if (chevron) return chevron;
  const w = 128, h = 128;
  const height = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const v = y / h;
    const slant = v < 0.5 ? v : 1 - v;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const t = (u * 4 + slant * 2.2) % 1;
      height[y * w + x] = t < 0.85 ? t / 0.85 : (1 - t) / 0.15;
    }
  }
  return (chevron = heightToNormal(height, w, h, 3));
}

let reeds: THREE.Texture | undefined;
/** Vertical reeding for coin edges. */
export function reedNormal(): THREE.Texture {
  if (reeds) return reeds;
  const w = 64, h = 8;
  const height = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) height[y * w + x] = 0.5 + 0.5 * Math.sin((x / w) * Math.PI * 2);
  const t = heightToNormal(height, w, h, 4);
  t.repeat.set(60, 1);
  return (reeds = t);
}

function bumpTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Text engraved into a ring/bangle liner. White = surface, dark = cut. */
export function bandEngraving(text: string): THREE.CanvasTexture {
  const c = canvas(2048, 128);
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  if (text.trim()) {
    g.fillStyle = '#222';
    g.font = `italic 600 64px ${ENGRAVE_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.filter = 'blur(1.2px)';
    g.fillText(text.trim(), c.width / 2, c.height / 2);
  }
  const t = bumpTexture(c);
  // Centre the text on u = 0 (the bottom of the band) and keep the canvas top toward
  // the back edge, so it reads upright when looking into the ring from above the front.
  t.wrapS = THREE.RepeatWrapping;
  t.offset.x = 0.5;
  t.flipY = false;
  return t;
}

/** Monogram or reverse-side inscription on a round/oval face (UV 0..1 square). */
export function faceEngraving(text: string, style: 'monogram' | 'inscription'): THREE.CanvasTexture {
  const c = canvas(512, 512);
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 512, 512);
  const t = text.trim();
  if (t) {
    g.fillStyle = '#1a1a1a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.filter = 'blur(1.5px)';
    if (style === 'monogram') {
      g.font = `600 ${t.length > 2 ? 150 : 200}px ${ENGRAVE_FONT}`;
      g.fillText(t.toUpperCase(), 256, 266);
      g.lineWidth = 7;
      g.strokeStyle = '#333';
      g.beginPath();
      g.ellipse(256, 256, 215, 215, 0, 0, Math.PI * 2);
      g.stroke();
    } else {
      g.font = `italic 500 ${t.length > 10 ? 48 : 64}px ${ENGRAVE_FONT}`;
      g.fillText(t, 256, 256);
    }
  }
  return bumpTexture(c);
}

let sun: THREE.Texture | undefined;
/** Obverse relief of the coin pendant: a radiant sun inside a beaded border. */
export function sunRelief(): THREE.Texture {
  if (sun) return sun;
  const c = canvas(512, 512);
  const g = c.getContext('2d')!;
  g.fillStyle = '#444';
  g.fillRect(0, 0, 512, 512);
  g.translate(256, 256);
  g.filter = 'blur(2px)';
  for (let i = 0; i < 32; i++) {
    g.save();
    g.rotate((i / 32) * Math.PI * 2);
    g.beginPath();
    const long = i % 2 === 0;
    g.moveTo(-10, -70);
    g.lineTo(0, long ? -200 : -165);
    g.lineTo(10, -70);
    g.closePath();
    g.fillStyle = '#ddd';
    g.fill();
    g.restore();
  }
  const grad = g.createRadialGradient(-15, -15, 4, 0, 0, 66);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(1, '#bbb');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, 64, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ccc';
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    g.beginPath();
    g.arc(Math.cos(a) * 228, Math.sin(a) * 228, 5, 0, Math.PI * 2);
    g.fill();
  }
  return (sun = bumpTexture(c));
}

/** Bar stamp: weight, fineness, maker and serial. Drawn for a w×h (cm) face. */
export function barStamp(weightLabel: string, serial: string, aspect: number): THREE.CanvasTexture {
  const W = 1024, H = Math.round(1024 / aspect);
  const c = canvas(W, H);
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#2a2a2a';
  g.strokeStyle = '#333';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.filter = 'blur(1.4px)';
  g.lineWidth = 8;
  g.strokeRect(W * 0.07, H * 0.1, W * 0.86, H * 0.8);
  g.font = `600 ${H * 0.11}px ${ENGRAVE_FONT}`;
  g.fillText('SOLENNE', W / 2, H * 0.24);
  g.font = `500 ${H * 0.18}px ${ENGRAVE_FONT}`;
  g.fillText(weightLabel.toUpperCase(), W / 2, H * 0.45);
  g.font = `500 ${H * 0.085}px "IBM Plex Mono", monospace`;
  g.fillText('FINE GOLD   999.9', W / 2, H * 0.64);
  g.font = `400 ${H * 0.065}px "IBM Plex Mono", monospace`;
  g.fillText(`ASSAYER · S/N ${serial}`, W / 2, H * 0.78);
  return bumpTexture(c);
}

/** Round obverse: legend around the rim, star at the centre. */
export function roundStamp(karat: number, weightLabel: string): THREE.CanvasTexture {
  const c = canvas(512, 512);
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 512, 512);
  g.translate(256, 256);
  g.fillStyle = '#2a2a2a';
  g.filter = 'blur(1.2px)';
  const legend = `· SOLENNE · ${weightLabel.toUpperCase()} · ${karat === 24 ? 'FINE GOLD 999.9' : 'CROWN GOLD 916'} `;
  g.font = `600 30px ${ENGRAVE_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const chars = [...legend];
  chars.forEach((ch, i) => {
    g.save();
    g.rotate((i / chars.length) * Math.PI * 2);
    g.fillText(ch, 0, -196);
    g.restore();
  });
  g.lineWidth = 5;
  g.strokeStyle = '#333';
  g.beginPath();
  g.arc(0, 0, 166, 0, Math.PI * 2);
  g.stroke();
  // eight-point compass star
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? (i % 4 === 0 ? 140 : 90) : 26;
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fillStyle = '#555';
  g.fill();
  return bumpTexture(c);
}
