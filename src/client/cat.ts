// The cat, as pixels: a tabby lying along a window's header, its front paws
// over the edge. One letter per pixel:
//
//   o outline   f fur      s stripe   w cream (muzzle, paws)
//   p ear       e eye      h shine    n nose     . nothing
//
// The base has no tail; a pose lays its tail (and, blinking, closed eyes)
// over it.

const BASE = [
  '................................',
  '..oo.......oo...................',
  '.opfo.....opfo..................',
  '.offfo...offfo..................',
  '.ofsfoooooofsfo.................',
  'offfffffffffffo.................',
  'offsfffffffsffo.................',
  'ofeeffffffeeffo.................',
  'ofehffffffehffoooooooooooo......',
  'offwwwwnnwwwfffsfffsfffsffoo....',
  'offwwwwwwwwwffffffffffffffffo...',
  '.ofwwwwwwwwfffsfffsfffsffffffo..',
  '.offfffffffffffffffffffffffffo..',
  '.osfffffffffffffffffffffffsffo..',
  '..oooooooooooooooooooooooooooo..',
  '...owwo..owwo...................',
  '...owwo..owwo...................',
  '....oo....oo....................',
];

export const WIDTH = 32;
export const HEIGHT = BASE.length;
/** The first row below the header's top edge: the paws. */
export const EDGE = 15;
/** Over the face (for the heart), in pixels. */
export const FACE = { x: 7, y: 1 };

type Patch = [row: number, col: number, text: string];

const TAILS: Record<'up' | 'swish', Patch[]> = {
  up: [
    [2, 26, '.oo..'],
    [3, 26, 'ofso.'],
    [4, 25, 'ofo...'],
    [5, 25, 'oso'],
    [6, 25, 'ofo'],
    [7, 25, 'oso'],
    [8, 25, 'ofo'],
  ],
  swish: [
    [3, 28, 'oo.'],
    [4, 27, 'osfo'],
    [5, 26, 'ofo..'],
    [6, 26, 'oso'],
    [7, 25, 'ofo'],
    [8, 25, 'oso'],
  ],
};

const BLINK: Patch[] = [
  [7, 2, 'ooo'],
  [8, 2, 'fff'],
  [7, 10, 'ooo'],
  [8, 10, 'fff'],
];

export type Pose = { tail: 'up' | 'swish'; blink: boolean };

export function pixels(pose: Pose): string[] {
  const grid = BASE.map((row) => row.split(''));
  for (const [r, c, text] of [...TAILS[pose.tail], ...(pose.blink ? BLINK : [])]) {
    for (let i = 0; i < text.length; i++) if (text[i] !== '.') grid[r][c + i] = text[i];
  }
  return grid.map((row) => row.join(''));
}

export type Palette = Record<'o' | 'f' | 's' | 'w' | 'p' | 'e' | 'h' | 'n', string>;

export const COATS: Record<string, Palette> = {
  ginger: { o: '#3a241c', f: '#ee9648', s: '#c4682c', w: '#ffecd2', p: '#f096a0', e: '#281e1e', h: '#ffffff', n: '#e27080' },
  grey: { o: '#282834', f: '#a0a6b4', s: '#767c8c', w: '#f0f0f5', p: '#f0a0aa', e: '#1e1e28', h: '#ffffff', n: '#e27080' },
  black: { o: '#101016', f: '#34343f', s: '#24242d', w: '#ebebf0', p: '#c87882', e: '#9cd250', h: '#ffffff', n: '#d86878' },
  cream: { o: '#5a463c', f: '#fae6c8', s: '#e2be96', w: '#fffaf0', p: '#f5aab4', e: '#3c2a24', h: '#ffffff', n: '#e27888' },
};

/** Draws the cat with its top left at (0, 0), `px` canvas pixels a pixel. */
export function draw(ctx: CanvasRenderingContext2D, pose: Pose, coat: Palette, px: number) {
  const rows = pixels(pose);
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const c = rows[y][x] as keyof Palette | '.';
      if (c === '.') continue;
      ctx.fillStyle = coat[c];
      ctx.fillRect(x * px, y * px, px, px);
    }
  }
}
