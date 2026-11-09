// The pet overlay: the cat lies on the top edge of the active window's
// header, in the middle, paws hanging over. It follows the focus from window
// to window, pans and zooms with the canvas, swishes its tail, blinks, and
// a click on it gets a heart.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CanvasActive, CanvasView, Host } from '@hyperpane/sdk/client';
import { useSetting } from '@hyperpane/sdk/client';
import { COATS, EDGE, FACE, HEIGHT, WIDTH, draw, type Pose } from './cat.ts';

/** Canvas units a cat pixel, by the Size setting. */
const SIZES: Record<string, number> = { small: 1.5, medium: 2, large: 3 };

export function Pet({ host }: { host: Host }) {
  const [view, setView] = useState<CanvasView>(() => host.canvas.view);
  const [active, setActive] = useState<CanvasActive | null>(() => host.canvas.active);
  const [coat] = useSetting<string>('coat');
  const [size] = useSetting<string>('size');
  const pose = usePose();
  const [hearts, setHearts] = useState<number[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const offView = host.on('view', setView);
    const offActive = host.on('active', setActive);
    return () => {
      offView();
      offActive();
    };
  }, [host]);

  // Whole device pixels a cat pixel, so it stays crisp at any zoom.
  const dpr = window.devicePixelRatio || 1;
  const device = Math.max(1, Math.round((SIZES[size] ?? SIZES.medium) * view.zoom * dpr));
  const px = device / dpr;
  const width = WIDTH * px;
  const at = active ? host.canvas.toScreen({ x: active.x + active.width / 2, y: active.y }) : null;
  // Only on a window wider than the cat.
  const shown = !!active && !!at && active.width * view.zoom >= width * 1.2;
  const left = at ? Math.round((at.x - width / 2) * dpr) / dpr : 0;
  const top = at ? Math.round((at.y - EDGE * px) * dpr) / dpr : 0;

  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el || !shown) return;
    el.width = WIDTH * device;
    el.height = HEIGHT * device;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, el.width, el.height);
    draw(ctx, pose, COATS[coat] ?? COATS.ginger, device);
  }, [shown, device, pose, coat]);

  // The cat above the edge takes clicks; the paws leave the header alone.
  useEffect(() => {
    host.overlay.setHitAreas(shown ? [{ x: left, y: top, width, height: EDGE * px }] : []);
  }, [host, shown, left, top, width, px]);

  if (!shown) return null;
  const pet = () => {
    const id = Date.now() + Math.random();
    setHearts((h) => [...h.slice(-4), id]);
    setTimeout(() => setHearts((h) => h.filter((x) => x !== id)), 1200);
  };
  return (
    <div style={{ position: 'absolute', left, top, width, height: HEIGHT * px }}>
      <canvas
        ref={canvas}
        onPointerDown={pet}
        style={{ width, height: HEIGHT * px, imageRendering: 'pixelated', cursor: 'pointer', display: 'block' }}
      />
      {hearts.map((id) => (
        <span
          key={id}
          className="pet-heart"
          style={{ left: FACE.x * px, top: FACE.y * px, fontSize: Math.max(10, 6 * px) }}
        >
          ♥
        </span>
      ))}
    </div>
  );
}

/** The tail swishes now and then; the eyes blink every few seconds. */
function usePose(): Pose {
  const [pose, setPose] = useState<Pose>({ tail: 'up', blink: false });
  useEffect(() => {
    let timer = 0;
    let swishes = 0;
    let nextBlink = Date.now() + 2000;
    const tick = () => {
      const now = Date.now();
      if (now >= nextBlink) {
        setPose((p) => ({ ...p, blink: true }));
        nextBlink = now + 2500 + Math.random() * 4000;
        timer = window.setTimeout(() => {
          setPose((p) => ({ ...p, blink: false }));
          timer = window.setTimeout(tick, 200);
        }, 160);
        return;
      }
      if (swishes > 0) {
        swishes--;
        setPose((p) => ({ ...p, tail: p.tail === 'up' ? 'swish' : 'up' }));
        timer = window.setTimeout(tick, 220);
        return;
      }
      setPose((p) => ({ ...p, tail: 'up' }));
      if (Math.random() < 0.25) swishes = 4;
      timer = window.setTimeout(tick, 900);
    };
    timer = window.setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, []);
  return pose;
}
