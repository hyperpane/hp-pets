// The pets, as pixels. Each is a few shapes (ellipses, polygons, a tail along
// a curve) laid out for a pose, then rasterized: each part fills its pixels,
// shaded by where they face (light from the top left), and rings itself with
// an outline, dark against nothing and a softer line over what's behind it.
// Faces, stripes, whiskers and the shadow go on last, pixel by pixel.
//
// A pet lies along the top edge of a window's header, its front paws over
// the edge, facing left; the overlay mirrors it to face right. Pure, so the
// tests (and the media) run it under Node.

export const WIDTH = 50;
/** Room at the sides: the pets are laid out from x = -OX. */
const OX = 2;
export const HEIGHT = 32;
/** The first row below the header's top edge: the paws, the shadow. */
export const EDGE = 28;

export type Kind = 'cat' | 'fox' | 'dog' | 'bunny';
export type Eyes = 'open' | 'closed' | 'happy' | 'half' | 'wide';

export type Pose = {
  /** 0 out, 1 in. */
  breath: 0 | 1;
  /** The tail's sway, -1 (towards the head) to 1. */
  tail: number;
  eyes: Eyes;
  /** Where it looks: -1 left, 0 ahead, 1 right (as drawn, facing left). */
  gaze: -1 | 0 | 1;
  /** An ear flicked. */
  ear: boolean;
  /** Mouth open: a smile, a yawn. */
  mouth: boolean;
  /** The nose up a pixel (a bunny's sniff). */
  sniff: boolean;
  /** In the air, between windows: stretched out. */
  leap: boolean;
  /** Just landed: flattened. */
  squash: boolean;
  /** Dust at its feet, 0 (none) to 3 (thinning out). */
  dust: 0 | 1 | 2 | 3;
  /** Cheeks pink: petted. */
  blush: boolean;
};

export const REST: Pose = {
  breath: 0,
  tail: 0,
  eyes: 'open',
  gaze: 0,
  ear: false,
  mouth: false,
  sniff: false,
  leap: false,
  squash: false,
  dust: 0,
  blush: false,
};

/** The colors, by letter:
 *  o outline, l a line inside, sh fur's shade, f fur, hi fur's light,
 *  x stripes, c cream (muzzle, chest, paws), cs its shade, ch its light,
 *  k dark (a fox's socks and ear tips, a pup's nose), p pink (ears, tongue),
 *  n nose, e eyes (ea: a black coat's, but a cat's), w their shine, b blush, s shadow, d dust, wh whiskers. */
export type Tone = 'o' | 'l' | 'sh' | 'f' | 'hi' | 'x' | 'c' | 'cs' | 'ch' | 'k' | 'p' | 'n' | 'e' | 'ea' | 'w' | 'b' | 's' | 'd' | 'wh';
export type Palette = Record<Tone, string>;

/** Coat by coat; each kind wears it its own way (a black fox is a silver
 * fox, a cream one an arctic fox). */
export const COATS: Record<string, Palette> = {
  ginger: {
    o: '#2a1812',
    l: '#9a4f22',
    sh: '#d4793a',
    f: '#f59d52',
    hi: '#ffc27e',
    x: '#c95f26',
    c: '#fff3e2',
    cs: '#ecd3b3',
    ch: '#ffffff',
    k: '#3b2219',
    p: '#f6a3ad',
    n: '#e9707f',
    e: '#2b1a17',
    ea: '#2b1a17',
    w: '#ffffff',
    b: 'rgba(255,110,130,0.55)',
    s: 'rgba(0,0,0,0.28)',
    d: 'rgba(225,210,195,0.75)',
    wh: 'rgba(255,255,255,0.55)',
  },
  grey: {
    o: '#1d1f29',
    l: '#5a6072',
    sh: '#8a91a3',
    f: '#adb4c4',
    hi: '#d3d9e5',
    x: '#737a8c',
    c: '#f6f7fb',
    cs: '#d7dbe5',
    ch: '#ffffff',
    k: '#2b2e3b',
    p: '#f2a5b1',
    n: '#de7a8c',
    e: '#1d2030',
    ea: '#1d2030',
    w: '#ffffff',
    b: 'rgba(255,120,145,0.5)',
    s: 'rgba(0,0,0,0.28)',
    d: 'rgba(215,220,230,0.75)',
    wh: 'rgba(255,255,255,0.55)',
  },
  black: {
    o: '#0b0b10',
    l: '#0b0b10',
    sh: '#23232d',
    f: '#35353f',
    hi: '#4f4f5d',
    x: '#2a2a33',
    c: '#f3f3f7',
    cs: '#cfd0db',
    ch: '#ffffff',
    k: '#121218',
    p: '#d98d99',
    n: '#d97587',
    e: '#a6dc5c',
    ea: '#e9b04c',
    w: '#ffffff',
    b: 'rgba(255,110,140,0.5)',
    s: 'rgba(0,0,0,0.3)',
    d: 'rgba(210,210,220,0.7)',
    wh: 'rgba(255,255,255,0.6)',
  },
  cream: {
    o: '#4a3329',
    l: '#b9906d',
    sh: '#e7c49c',
    f: '#f7dfbc',
    hi: '#fff3df',
    x: '#dfb88c',
    c: '#fffaf2',
    cs: '#f0e1cc',
    ch: '#ffffff',
    k: '#6e4b39',
    p: '#f7a9b5',
    n: '#e58395',
    e: '#3a2620',
    ea: '#3a2620',
    w: '#ffffff',
    b: 'rgba(255,120,140,0.5)',
    s: 'rgba(0,0,0,0.24)',
    d: 'rgba(235,225,210,0.75)',
    wh: 'rgba(255,255,255,0.6)',
  },
};

/** Tabby stripes on these coats (cats). */
const TABBY = new Set(['ginger', 'grey']);

// —— Shapes ——————————————————————————————————————————————————————————

type Ellipse = { e: [cx: number, cy: number, rx: number, ry: number, rot?: number] };
type Poly = { t: [number, number][] };
type Shape = Ellipse | Poly;

/** A filled part: its shapes, its colors, and how it's ringed. `outer`
 * rings only against nothing (no line over what's behind it). */
type Part = {
  shapes: Shape[];
  tone: 'f' | 'c' | 'k';
  ring?: 'full' | 'soft' | 'outer' | 'none';
  /** Nothing at or below this row (lying flat on the header). */
  clip?: number;
  /** Stripes: the pixels that take `x` instead of fur. */
  stripes?: (x: number, y: number) => boolean;
  /** Flat, no light and shade. */
  flat?: boolean;
};

const el = (cx: number, cy: number, rx: number, ry: number, rot = 0): Ellipse => ({ e: [cx, cy, rx, ry, rot] });
const poly = (...t: [number, number][]): Poly => ({ t });

/** Is the pixel's center in the shape; and where its surface faces there
 * (-1..1 each way), for the light. */
function inside(s: Shape, px: number, py: number): [number, number] | null {
  if ('e' in s) {
    const [cx, cy, rx, ry, rot = 0] = s.e;
    const dx = px - cx;
    const dy = py - cy;
    const c = Math.cos(-rot);
    const n = Math.sin(-rot);
    const u = (dx * c - dy * n) / rx;
    const v = (dx * n + dy * c) / ry;
    if (u * u + v * v > 1) return null;
    // Back to the world's directions.
    return [u * Math.cos(rot) - v * Math.sin(rot), u * Math.sin(rot) + v * Math.cos(rot)];
  }
  let into = false;
  const t = s.t;
  for (let i = 0, j = t.length - 1; i < t.length; j = i++) {
    const [xi, yi] = t[i];
    const [xj, yj] = t[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) into = !into;
  }
  return into ? [0, 0] : null;
}

/** A tail: circles along a quadratic curve, `r0` thick at its base to `r1`
 * at the tip (and `mid` at its middle, for a bushy one). */
function tail(a: [number, number], b: [number, number], c: [number, number], r0: number, r1: number, mid = (r0 + r1) / 2): Ellipse[] {
  const out: Ellipse[] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0];
    const y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1];
    const r = t < 0.5 ? r0 + (mid - r0) * (t / 0.5) : mid + (r1 - mid) * ((t - 0.5) / 0.5);
    out.push(el(x, y, r, r));
  }
  return out;
}

// —— The grid ————————————————————————————————————————————————————————

export type Grid = (Tone | null)[];

class Canvas {
  g: Grid = new Array(WIDTH * HEIGHT).fill(null);
  get(x: number, y: number): Tone | null {
    x += OX;
    return x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT ? null : this.g[y * WIDTH + x];
  }
  set(x: number, y: number, t: Tone) {
    x += OX;
    if (x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT) this.g[y * WIDTH + x] = t;
  }
  /** Only where there's something (on the pet). */
  on(x: number, y: number, t: Tone) {
    if (this.get(x, y)) this.set(x, y, t);
  }
  /** Only where there's nothing. */
  off(x: number, y: number, t: Tone) {
    if (!this.get(x, y)) this.set(x, y, t);
  }

  part(p: Part) {
    const mask = new Uint8Array(WIDTH * HEIGHT);
    const tones: Tone[] = new Array(WIDTH * HEIGHT);
    const [dark, mid, light]: Tone[] = p.tone === 'f' ? ['sh', 'f', 'hi'] : p.tone === 'c' ? ['cs', 'c', 'ch'] : ['k', 'k', 'k'];
    for (let y = 0; y < HEIGHT; y++) {
      if (p.clip !== undefined && y >= p.clip) break;
      for (let x = 0; x < WIDTH; x++) {
        let n: [number, number] | null = null;
        for (const s of p.shapes) {
          const at = inside(s, x - OX + 0.5, y + 0.5);
          if (at) n = at;
        }
        if (!n) continue;
        mask[y * WIDTH + x] = 1;
        // Lit from the top left: its rim there light, the far rim in shade.
        const lit = -(0.5 * n[0] + 0.86 * n[1]);
        let t: Tone = p.flat ? mid : lit > 0.62 ? light : lit < -0.5 ? dark : mid;
        if (p.stripes?.(x - OX, y) && t !== light) t = 'x';
        tones[y * WIDTH + x] = t;
      }
    }
    const ring = p.ring ?? 'full';
    if (ring !== 'none') {
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          if (mask[y * WIDTH + x]) continue;
          const near =
            (x > 0 && mask[y * WIDTH + x - 1]) ||
            (x < WIDTH - 1 && mask[y * WIDTH + x + 1]) ||
            (y > 0 && mask[(y - 1) * WIDTH + x]) ||
            (y < HEIGHT - 1 && mask[(y + 1) * WIDTH + x]);
          if (!near) continue;
          if (!this.g[y * WIDTH + x]) this.g[y * WIDTH + x] = 'o';
          else if (ring === 'full') this.g[y * WIDTH + x] = 'l';
          else if (ring === 'soft') this.g[y * WIDTH + x] = 'sh';
        }
      }
    }
    for (let i = 0; i < mask.length; i++) if (mask[i]) this.g[i] = tones[i];
  }
}

// —— The pets ————————————————————————————————————————————————————————

/** Where a pet's face is, as drawn (facing left), for hearts and z's. */
export const FACE = { x: 12 + OX, y: 8 };
/** The middle of its head, as drawn. */
export const HEAD = { x: 12 + OX, y: 18 };

/** The pet, pixel by pixel: `WIDTH × HEIGHT`, row by row, null for none. */
export function render(kind: Kind, coat: string, pose: Pose): Grid {
  const cv = new Canvas();
  const fur = coat in COATS ? coat : 'ginger';
  const asleep = pose.eyes === 'closed';
  const b = pose.breath;
  // The whole pet a row lower when flattened, the head lower asleep.
  const sq = pose.squash ? 1 : 0;
  const hy = (asleep ? 1 : 0) + sq;
  const gx = pose.gaze;

  // The tail, behind it all.
  const sway = pose.tail;
  if (kind === 'cat') {
    const tip: [number, number] = pose.leap ? [45, 19] : [40 + 3 * sway, 10 + Math.abs(sway) * 1.5];
    cv.part({
      shapes: tail([34, 24], pose.leap ? [41, 23] : [43, 23], tip, 1.9, 1.4),
      tone: 'f',
      stripes: TABBY.has(fur) ? (x, y) => (x + y) % 4 === 0 : undefined,
    });
  } else if (kind === 'fox') {
    const tip: [number, number] = pose.leap ? [44, 18] : [41 + 2 * sway, 11 + Math.abs(sway)];
    const shapes = tail([33, 24], pose.leap ? [40, 24] : [43.5, 23], tip, 2.6, 2.2, 3.8);
    cv.part({ shapes, tone: 'f' });
    // A white tip.
    cv.part({ shapes: shapes.slice(-6), tone: 'c', ring: 'none' });
  } else if (kind === 'dog') {
    const tip: [number, number] = pose.leap ? [44, 19] : [41 + 2.5 * sway, 14];
    cv.part({ shapes: tail([34, 22], [39, 21], tip, 2, 1.5), tone: 'f' });
  } else {
    cv.part({ shapes: [el(35 + sway * 0.4, 21.5 + sq, 2.8, 2.6)], tone: 'c' });
  }

  // The body, lying flat on the header.
  const body =
    kind === 'bunny'
      ? el(24.5, 21.2 - b * 0.5 + sq * 0.6, 11, 7.4 + b * 0.5 - sq)
      : pose.leap
        ? el(25, 21.5, 14, 5.6)
        : el(24.5, 20.6 - b * 0.5 + sq * 0.6, 11.8, 7.6 + b * 0.5 - sq);
  const tabby = kind === 'cat' && TABBY.has(fur);
  cv.part({
    shapes: [body],
    tone: 'f',
    clip: EDGE - 2,
    stripes: tabby ? (x, y) => y < 18 && [20, 24, 28].includes(x - (y > 15 ? 1 : 0)) : undefined,
  });
  // A haunch, its back leg folded under.
  if (!pose.leap) {
    const hx = kind === 'bunny' ? 29.5 : 30.5;
    cv.part({ shapes: [el(hx, 22.6 + sq * 0.5, 5.2, 4.2 - sq * 0.5)], tone: 'f', clip: EDGE - 2, ring: 'soft' });
  } else {
    // Its back legs out behind.
    cv.part({ shapes: [el(37, 24.5, 4.5, 1.6, 0.35)], tone: 'f' });
  }
  // A cream chest.
  if (kind !== 'bunny' && (fur === 'black' || kind === 'fox' || kind === 'dog')) {
    cv.part({ shapes: [el(13, 25, 5, 2.4)], tone: 'c', ring: 'none', clip: EDGE - 2 });
  }

  // The front paws, over the edge.
  const pawTone = kind === 'fox' ? 'k' : fur === 'black' || kind === 'bunny' || kind === 'dog' ? 'c' : 'f';
  for (const px of pose.leap ? [6, 10] : [8, 12]) {
    const reach = pose.leap ? 1.2 : 0;
    cv.part({
      shapes: [poly([px, EDGE - 4], [px + 3, EDGE - 4], [px + 3, EDGE + reach], [px, EDGE + reach]), el(px + 1.5, EDGE + 0.6 + reach, 1.5, 1.3)],
      tone: pawTone,
    });
    // Toes.
    cv.set(px + 1, EDGE + 2 + Math.round(reach), 'o');
  }

  // The head.
  const cx = 12;
  const cy = 18 + hy;
  const head: Shape[] = [];
  if (kind === 'cat') {
    head.push(el(cx, cy, 7.6, 6.2), el(cx - 5, cy + 3.2, 3.2, 2.7), el(cx + 5, cy + 3.2, 3.2, 2.7));
    const flick = pose.ear ? 1 : 0;
    const back = pose.leap ? 1.5 : 0;
    head.push(poly([cx - 7.4, cy - 2], [cx - 5.6 - back, cy - 10.4 + back], [cx - 1, cy - 5.4]));
    head.push(poly([cx + 1, cy - 5.4], [cx + 5.6 + flick + back, cy - 10.4 + flick + back], [cx + 7.4, cy - 2]));
  } else if (kind === 'fox') {
    head.push(el(cx, cy, 7.4, 6), el(cx - 5.4, cy + 3, 3.4, 2.6), el(cx + 5.4, cy + 3, 3.4, 2.6));
    const flick = pose.ear ? 1 : 0;
    const back = pose.leap ? 1.5 : 0;
    head.push(poly([cx - 7.6, cy - 1], [cx - 6.2 - back, cy - 12 + back], [cx - 0.6, cy - 5]));
    head.push(poly([cx + 0.6, cy - 5], [cx + 6.2 + flick + back, cy - 12 + flick + back], [cx + 7.6, cy - 1]));
  } else if (kind === 'dog') {
    head.push(el(cx, cy, 7.6, 6.4), el(cx, cy + 3.4, 5.4, 3.2));
  } else {
    head.push(el(cx, cy + 0.4, 7, 5.9), el(cx - 4.6, cy + 3, 3, 2.6), el(cx + 4.6, cy + 3, 3, 2.6));
  }
  // A bunny's long ears go behind its head.
  if (kind === 'bunny') {
    const droop = asleep ? 0.5 : 0;
    const flick = pose.ear ? 0.25 : 0;
    const back = pose.leap ? 0.5 : 0;
    const left = el(cx - 3.2, cy - 9, 2.3, 6.6, -0.18 - droop * 0.4 + back);
    const right = el(cx + 3.2 + droop * 3, cy - 9 + droop * 4, 2.3, 6.6, 0.18 + droop * 2.2 + flick + back);
    cv.part({ shapes: [left], tone: 'f' });
    cv.part({ shapes: [right], tone: 'f' });
    cv.part({ shapes: [el(cx - 3.2, cy - 8.4, 1, 4.6, -0.18 - droop * 0.4 + back)], tone: 'f', ring: 'none', flat: true });
    for (const [x, y] of fill(el(cx - 3.2, cy - 8.4, 1, 4.6, -0.18 - droop * 0.4 + back))) cv.on(x, y, 'p');
    for (const [x, y] of fill(el(cx + 3.2 + droop * 3, cy - 8.4 + droop * 4, 1, 4.6, 0.18 + droop * 2.2 + flick + back))) cv.on(x, y, 'p');
  }
  cv.part({ shapes: head, tone: 'f', stripes: tabby ? (x, y) => y <= cy - 3 && y >= cy - 5 && (x === cx - 3 || x === cx || x === cx + 2) : undefined });

  // Inside the ears.
  if (kind === 'cat' || kind === 'fox') {
    const tall = kind === 'fox' ? 1.4 : 0;
    const flick = pose.ear ? 1 : 0;
    const back = pose.leap ? 1.5 : 0;
    for (const [x, y] of fill(poly([cx - 6, cy - 2.6], [cx - 5.3 - back, cy - 8.4 - tall + back], [cx - 2.4, cy - 5]))) cv.on(x, y, 'p');
    for (const [x, y] of fill(poly([cx + 2.4, cy - 5], [cx + 5.3 + flick + back, cy - 8.4 - tall + flick + back], [cx + 6, cy - 2.6]))) cv.on(x, y, 'p');
    if (kind === 'fox') {
      // Dark tips.
      for (const [x, y] of fill(poly([cx - 7.6, cy - 7], [cx - 6.2 - back, cy - 12.6 + back], [cx - 3, cy - 8]))) cv.on(x, y, 'k');
      for (const [x, y] of fill(poly([cx + 3, cy - 8], [cx + 6.2 + flick + back, cy - 12.6 + flick + back], [cx + 7.6, cy - 7]))) cv.on(x, y, 'k');
    }
  }

  // The muzzle: two puffs (a cat, a bunny), a fox's white cheeks, a pup's
  // snout.
  const mx = cx + gx;
  if (kind === 'fox') {
    for (const [x, y] of fill(el(cx - 5, cy + 3.4, 3.6, 2.4))) cv.on(x, y, 'c');
    for (const [x, y] of fill(el(cx + 5, cy + 3.4, 3.6, 2.4))) cv.on(x, y, 'c');
    for (const [x, y] of fill(el(mx, cy + 3.2, 3, 2.2))) cv.on(x, y, 'c');
  } else if (kind === 'dog') {
    for (const [x, y] of fill(el(mx, cy + 3.8, 4.4, 2.5))) cv.on(x, y, 'c');
    // A blaze up its forehead.
    for (const [x, y] of fill(el(cx + gx * 0.5, cy - 2.6, 1, 3.2))) cv.on(x, y, 'c');
  } else if (fur === 'black' || kind === 'bunny') {
    for (const [x, y] of fill(el(mx - 1.5, cy + 3.3, 2.3, 1.8))) cv.on(x, y, 'c');
    for (const [x, y] of fill(el(mx + 1.5, cy + 3.3, 2.3, 1.8))) cv.on(x, y, 'c');
  } else {
    for (const [x, y] of fill(el(mx - 1.4, cy + 3.3, 2.1, 1.7))) cv.on(x, y, 'c');
    for (const [x, y] of fill(el(mx + 1.4, cy + 3.3, 2.1, 1.7))) cv.on(x, y, 'c');
  }

  // A pup's floppy ears, over the sides of its head.
  if (kind === 'dog') {
    const lift = pose.mouth || pose.ear ? 1.2 : 0;
    const fly = pose.leap ? 2 : 0;
    cv.part({ shapes: [el(cx - 7, cy - 0.4 - lift - fly, 2.6, 4.8, 0.35 + fly * 0.3)], tone: 'f' });
    cv.part({ shapes: [el(cx + 7, cy - 0.4 - lift - fly, 2.6, 4.8, -0.35 - fly * 0.3)], tone: 'f' });
    for (const [x, y] of fill(el(cx - 7, cy - 0.4 - lift - fly, 2.6, 4.8, 0.35 + fly * 0.3)))
      if (cv.get(x, y) === 'f' || cv.get(x, y) === 'hi') cv.set(x, y, 'sh');
    for (const [x, y] of fill(el(cx + 7, cy - 0.4 - lift - fly, 2.6, 4.8, -0.35 - fly * 0.3)))
      if (cv.get(x, y) === 'f' || cv.get(x, y) === 'hi') cv.set(x, y, 'sh');
  }

  // Eyes: two pixels wide, three tall.
  const ey = cy - 1;
  const iris: Tone = kind !== 'cat' && fur === 'black' ? 'ea' : 'e';
  for (const ex of [cx - 4 + gx, cx + 2 + gx]) eye(cv, ex, ey, pose.eyes, iris);

  // The nose, and a little smile under it.
  const ny = cy + 2 - (pose.sniff ? 1 : 0);
  if (kind === 'dog') {
    for (const [dx, dy] of [
      [-2, 0],
      [-1, 0],
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
    ])
      cv.set(mx + dx, ny + dy, 'k');
  } else {
    cv.set(mx - 1, ny, 'n');
    cv.set(mx, ny, 'n');
  }
  const my = ny + (kind === 'dog' ? 2 : 1);
  if (pose.mouth) {
    cv.set(mx - 2, my, 'l');
    cv.set(mx + 1, my, 'l');
    cv.set(mx - 1, my, 'o');
    cv.set(mx, my, 'o');
    cv.set(mx - 1, my + 1, 'p');
    cv.set(mx, my + 1, 'p');
  } else {
    cv.set(mx - 2, my, 'l');
    cv.set(mx + 1, my, 'l');
    cv.set(mx - 1, my + 1, 'l');
    cv.set(mx, my + 1, 'l');
    // A pup's tongue, out in a smile.
    if (kind === 'dog' && pose.eyes === 'happy') cv.set(mx, my + 2, 'p');
  }

  // Blush.
  if (pose.blush || pose.eyes === 'happy') {
    for (const bx of [cx - 6 + gx, cx + 4 + gx]) {
      cv.on(bx, cy + 2, 'b');
      cv.on(bx + 1, cy + 2, 'b');
    }
  }

  // Whiskers, out past its cheeks.
  if (kind === 'cat' || kind === 'bunny' || kind === 'fox') {
    const wy = cy + 3;
    const reach = kind === 'bunny' ? 2 : 3;
    for (let i = 1; i <= reach; i++) {
      const lx = left(cv, wy) - i;
      cv.off(lx, wy - (i === reach ? 1 : 0), 'wh');
      if (kind === 'cat') cv.off(left(cv, wy + 2) - i, wy + 2 + (i === reach ? 1 : 0), 'wh');
    }
  }

  // Its shadow on the header, and dust where it landed.
  if (!pose.leap) {
    for (let x = 4; x < 42; x++) {
      cv.off(x, EDGE, 's');
      if (x > 6 && x < 40) cv.off(x, EDGE + 1, 's');
    }
  }
  if (pose.dust) {
    const out = pose.dust * 2;
    for (const [x, y] of [
      [2 - out, EDGE - 2],
      [4 - out, EDGE - 3 - (pose.dust > 1 ? 1 : 0)],
      [1 - out, EDGE - 1],
      [41 + out, EDGE - 2],
      [43 + out, EDGE - 3 - (pose.dust > 1 ? 1 : 0)],
      [44 + out, EDGE - 1],
    ] as [number, number][]) {
      if (pose.dust < 3 || (x + y) % 2) cv.off(x, y, 'd');
    }
  }
  return cv.g;
}

function eye(cv: Canvas, x: number, y: number, eyes: Eyes, iris: Tone) {
  const shut = (rows: [number, number][]) => {
    for (const [dx, dy] of rows) cv.set(x + dx, y + dy, 'o');
  };
  if (eyes === 'closed')
    return shut([
      [-1, 1],
      [0, 2],
      [1, 2],
      [2, 1],
    ]);
  if (eyes === 'happy')
    return shut([
      [-1, 2],
      [0, 1],
      [1, 1],
      [2, 2],
    ]);
  if (eyes === 'half') {
    shut([
      [-1, 1],
      [0, 1],
      [1, 1],
      [2, 1],
    ]);
    cv.set(x, y + 2, iris);
    cv.set(x + 1, y + 2, iris);
    return;
  }
  for (let dy = 0; dy < 3; dy++) {
    cv.set(x, y + dy, iris);
    cv.set(x + 1, y + dy, iris);
  }
  cv.set(x, y, 'w');
  if (eyes === 'wide') cv.set(x + 1, y + 2, 'w');
}

/** The pixels a shape covers. */
function fill(s: Shape): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 0; y < HEIGHT; y++) for (let x = -OX; x < WIDTH - OX; x++) if (inside(s, x + 0.5, y + 0.5)) out.push([x, y]);
  return out;
}

/** The leftmost pixel of the pet on a row (the head's side). */
function left(cv: Canvas, y: number): number {
  for (let x = -OX; x < WIDTH / 2; x++) if (cv.get(x, y)) return x;
  return 0;
}

/** Draws the pet with its top left at (0, 0), `px` canvas pixels a pixel. */
export function draw(ctx: CanvasRenderingContext2D, grid: Grid, coat: string, px: number) {
  const pal = COATS[coat] ?? COATS.ginger;
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const t = grid[y * WIDTH + x];
      if (!t) continue;
      ctx.fillStyle = pal[t];
      ctx.fillRect(x * px, y * px, px, px);
    }
  }
}
