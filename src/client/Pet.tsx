// The pet overlay: the pet lies on the top edge of the active window's
// header, in the middle, front paws over the edge. When the focus moves to
// another window it leaps there, facing the way it goes, and lands in a puff
// of dust; it pans and zooms with the canvas and rides along when its window
// moves. Its brain (brain.ts) says what it does, sprite.ts draws it.
//
// The drawing is done outside React: one loop places it and redraws its
// canvas only when its pose changes, every frame while it's in the air and
// a few times a second otherwise. React keeps the hearts and the z's.

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import type { CanvasActive, CanvasView, Host } from '@hyperpane/sdk/client';
import { useSetting } from '@hyperpane/sdk/client';
import { Brain, key } from './brain.ts';
import { EDGE, FACE, HEAD, HEIGHT, type Kind, WIDTH, draw, render } from './sprite.ts';

/** Canvas units a pet pixel, by the Size setting. */
const SIZES: Record<string, number> = { small: 1.25, medium: 1.75, large: 2.5 };
const KINDS = new Set<Kind>(['cat', 'fox', 'dog', 'bunny']);

type Point = { x: number; y: number };
type Jump = { from: Point; start: number; duration: number; height: number };
type Bit = { id: number; kind: 'heart' | 'z'; x: number; drift: number };

export function Pet({ host }: { host: Host }) {
  const [kindSetting] = useSetting<string>('pet');
  const [coat] = useSetting<string>('coat');
  const [size] = useSetting<string>('size');
  const kind: Kind = KINDS.has(kindSetting as Kind) ? (kindSetting as Kind) : 'cat';
  const [bits, setBits] = useState<Bit[]>([]);
  const [shown, setShown] = useState(false);
  const [mirror, setMirror] = useState(false);
  const [px, setPx] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ coat, size, kind });
  live.current = { coat, size, kind };
  const brain = useRef<Brain | null>(null);
  if (!brain.current || brain.current.kind !== kind) brain.current = new Brain(kind, performance.now());
  /** Petted: the loop takes it from here. */
  const petted = useRef(false);
  const hovered = useRef<boolean | null>(null);

  useEffect(() => {
    let view: CanvasView = host.canvas.view;
    let active: CanvasActive | null = host.canvas.active;
    let pointer: Point | null = null;
    /** Where it sits (the header's top middle), on the canvas. */
    let at: Point | null = null;
    let sitting: number | null = null;
    let jump: Jump | null = null;
    let facing = 1;
    let drawn = '';
    let place = '';
    let areas = '';
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let nextZ = 0;
    let bitId = 0;
    // What React was last told: it's told again only when one changes.
    let told = { shown: false, px: 1, mirror: false };
    const tell = (shown: boolean, px: number, mirror: boolean) => {
      if (shown !== told.shown) setShown(shown);
      if (px !== told.px) setPx(px);
      if (mirror !== told.mirror) setMirror(mirror);
      told = { shown, px, mirror };
    };
    const still = matchMedia('(prefers-reduced-motion: reduce)');

    const spawn = (kind: Bit['kind']) => {
      const id = ++bitId;
      const bit: Bit = { id, kind, x: (Math.random() - 0.5) * 6, drift: kind === 'z' ? 1 : (Math.random() - 0.5) * 2 };
      setBits((b) => [...b.slice(-5), bit]);
      setTimeout(() => setBits((b) => b.filter((x) => x.id !== id)), kind === 'z' ? 2400 : 1300);
    };

    const tick = () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      frame = 0;
      const now = performance.now();
      const b = brain.current;
      const { coat, size, kind } = live.current;
      if (!b) return;
      const unit = SIZES[size] ?? SIZES.medium;
      const dpr = globalThis.devicePixelRatio || 1;
      // Screen pixels a pet pixel: exactly the canvas's zoom, so it keeps its
      // size next to its window as you zoom. It's drawn at whole device
      // pixels a pet pixel, the next size up, and shown at this size.
      const scale = unit * view.zoom;
      const device = Math.max(1, Math.ceil(scale * dpr - 0.01));
      const width = WIDTH * scale;

      if (!active || active.width * view.zoom < width * 1.1) {
        // Nowhere to sit: gone, and back from above next time.
        at = null;
        sitting = null;
        jump = null;
        tell(false, told.px, told.mirror);
        if (areas !== '') host.overlay.setHitAreas([]);
        areas = '';
        return;
      }
      const target = { x: active.x + active.width / 2, y: active.y };
      if (active.window !== sitting) {
        // Off to the new window: from where it was, or dropping in from
        // above.
        const from = at ?? { x: target.x, y: target.y - 70 };
        const dx = target.x - from.x;
        if (Math.abs(dx) > 4) facing = dx > 0 ? -1 : 1;
        const far = Math.hypot(dx, target.y - from.y);
        if (still.matches) {
          jump = null;
        } else {
          const duration = at ? Math.min(750, 320 + far * 0.35) : 380;
          // An arc, no higher than the room above it on the screen.
          const room = (Math.min(from.y, target.y) * view.zoom + view.y - HEIGHT * scale - 8) / view.zoom;
          const height = at ? Math.max(12, Math.min(160, 30 + far * 0.25, room)) : 0;
          jump = { from, start: now, duration, height };
          b.leap(now, now + duration);
        }
        sitting = active.window;
      }

      // Where it is now: on its window, or along the way.
      let pos = target;
      let tilt = 0;
      if (jump) {
        const u = (now - jump.start) / jump.duration;
        if (u >= 1) {
          jump = null;
        } else {
          const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
          pos = {
            x: jump.from.x + (target.x - jump.from.x) * e,
            y: jump.from.y + (target.y - jump.from.y) * e - jump.height * 4 * u * (1 - u),
          };
          // Nose up going up, down coming down.
          const climb = jump.height * 4 * (1 - 2 * u) + (jump.from.y - target.y);
          const run = Math.abs(target.x - jump.from.x) + 1;
          tilt = Math.max(-18, Math.min(18, (Math.atan2(climb, run) * 180) / Math.PI)) * (facing > 0 ? 1 : -1);
        }
      }
      at = pos;

      // On the screen.
      const sx = pos.x * view.zoom + view.x;
      const sy = pos.y * view.zoom + view.y;
      const left = Math.round((sx - width / 2) * dpr) / dpr;
      const top = Math.round((sy - EDGE * scale) * dpr) / dpr;

      // What it sees: the pointer, from its head, in its pixels.
      if (pointer) {
        const hx = pos.x + (HEAD.x - WIDTH / 2) * unit * facing;
        const hy = pos.y + (HEAD.y - EDGE) * unit;
        b.see(now, { x: ((pointer.x - hx) / unit) * facing, y: (pointer.y - hy) / unit });
      } else {
        b.see(now, null);
      }
      if (hovered.current !== null) {
        b.hover(now, hovered.current);
        hovered.current = null;
      }
      if (petted.current) {
        petted.current = false;
        b.pet(now);
        spawn('heart');
      }

      const pose = b.pose(now);
      const mood = b.mood(now);
      if (mood === 'asleep' && now >= nextZ && !still.matches) {
        spawn('z');
        nextZ = now + 1700;
      }

      tell(true, scale, facing < 0);
      const el = box.current;
      const cv = canvas.current;
      if (el && cv) {
        const p = `${left},${top},${tilt}`;
        if (p !== place) {
          el.style.transform = `translate(${left}px, ${top}px)`;
          cv.style.rotate = tilt ? `${tilt}deg` : '';
          place = p;
        }
        const k = `${kind}${coat}${device}${key(pose)}`;
        if (k !== drawn) {
          cv.width = WIDTH * device;
          cv.height = HEIGHT * device;
          const ctx = cv.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, cv.width, cv.height);
            draw(ctx, render(kind, coat, pose), coat, device);
          }
          drawn = k;
        }
      }
      // The part above the edge takes clicks; the paws leave the header to
      // the window. None while it's in the air.
      const a = jump ? '' : `${left},${top},${width},${EDGE * scale}`;
      if (a !== areas) {
        host.overlay.setHitAreas(jump ? [] : [{ x: left, y: top, width, height: EDGE * scale }]);
        areas = a;
      }

      // A hidden page: nothing to draw until it's back (visibilitychange).
      if (document.hidden) return;
      // As often as its pose can change: a wag is quick, a blink 140 ms,
      // a sleeping tail barely moves.
      if (jump) frame = requestAnimationFrame(tick);
      else timer = setTimeout(tick, mood === 'asleep' ? 500 : mood === 'happy' ? 50 : 100);
    };

    const offView = host.on('view', (v: CanvasView) => {
      view = v;
      tick();
    });
    const offActive = host.on('active', (a: CanvasActive | null) => {
      active = a;
      tick();
    });
    const offPointer = host.on('pointer', (p: Point | null) => {
      pointer = p;
    });
    const nudge = () => tick();
    addEventListener('pet:nudge', nudge);
    document.addEventListener('visibilitychange', nudge);
    tick();
    return () => {
      offView();
      offActive();
      offPointer();
      removeEventListener('pet:nudge', nudge);
      document.removeEventListener('visibilitychange', nudge);
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      host.overlay.setHitAreas([]);
    };
  }, [host]);

  // A setting changed: draw it now.
  useEffect(() => {
    dispatchEvent(new Event('pet:nudge'));
  }, [kind, coat, size]);

  const width = WIDTH * px;
  // The face, flipped with the pet.
  const face = (mirror ? WIDTH - FACE.x : FACE.x) * px;
  return (
    <div ref={box} style={{ position: 'absolute', left: 0, top: 0, width, height: HEIGHT * px, display: shown ? 'block' : 'none' }}>
      <canvas
        ref={canvas}
        onPointerDown={() => {
          petted.current = true;
          dispatchEvent(new Event('pet:nudge'));
        }}
        onPointerEnter={() => {
          hovered.current = true;
        }}
        onPointerLeave={() => {
          hovered.current = false;
        }}
        style={{
          width,
          height: HEIGHT * px,
          imageRendering: 'pixelated',
          cursor: 'pointer',
          display: 'block',
          scale: mirror ? '-1 1' : undefined,
          transformOrigin: `50% ${(EDGE / HEIGHT) * 100}%`,
        }}
      />
      {bits.map((b) => (
        <Pixels
          key={b.id}
          className={b.kind === 'heart' ? 'pet-heart' : 'pet-z'}
          art={b.kind === 'heart' ? HEART : ZED}
          px={Math.max(1, px * (b.kind === 'heart' ? 1 : 0.8))}
          style={{ left: face + b.x * px, top: (FACE.y - 2) * px, fontSize: 6 * px, ['--drift' as string]: `${b.drift * (mirror ? -1 : 1) * 10 * px}px` }}
        />
      ))}
    </div>
  );
}

const HEART = { rows: ['.11.11.', '1211111', '1111111', '.11111.', '..111..', '...1...'], colors: { 1: '#ff5f80', 2: '#ffd0da' } };
const ZED = { rows: ['1111', '..1.', '.1..', '1111'], colors: { 1: 'rgba(225,232,255,0.9)' } };

/** A little pixel picture: a heart, a z. */
function Pixels({
  art,
  px,
  className,
  style,
}: {
  art: { rows: string[]; colors: Record<string, string> };
  px: number;
  className: string;
  style: CSSProperties;
}) {
  const w = art.rows[0].length;
  const h = art.rows.length;
  return (
    <svg className={className} width={w * px} height={h * px} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" style={style} aria-hidden>
      {art.rows.flatMap((row, y) =>
        [...row].map((c, x) => (c in art.colors ? <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={art.colors[c]} /> : null)),
      )}
    </svg>
  );
}
