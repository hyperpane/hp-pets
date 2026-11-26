// What the pet is doing, moment by moment: it breathes, sways its tail,
// blinks, flicks an ear, looks at the pointer when it's near (and around
// when it isn't), loves being petted, yawns and naps when left alone, and
// wakes up when you come back. Time and what it notices in, a pose out.
// Pure (the clock and the dice are given), so the tests run it under Node.

import { type Eyes, type Kind, type Pose, REST } from './sprite.ts';

/** Asleep after this long with nothing near it. */
export const SLEEP_AFTER = 45_000;
/** It yawns this long before it nods off. */
const YAWN = 1_400;
/** Happy this long after a pet. */
const HAPPY = 1_800;
/** Drowsy this long after waking. */
const WAKING = 900;
/** Landing: flattened, then dust settling. */
const SQUASH = 130;
const DUST = 420;

export type Mood = 'awake' | 'happy' | 'asleep';

export class Brain {
  private rand: () => number;
  /** When something last caught its attention. */
  private stirred: number;
  private wokeAt = -Infinity;
  private happyUntil = -Infinity;
  private hovered = false;
  private nextBlink: number;
  private blinkUntil = -Infinity;
  private nextFlick: number;
  private flickUntil = -Infinity;
  private nextLook: number;
  private wander: -1 | 0 | 1 = 0;
  private looking: -1 | 0 | 1 | null = null;
  private nextSniff: number;
  private sniffUntil = -Infinity;
  private leapUntil = -Infinity;
  private landedAt = -Infinity;

  readonly kind: Kind;

  constructor(kind: Kind, now: number, rand: () => number = Math.random) {
    this.kind = kind;
    this.rand = rand;
    this.stirred = now;
    this.nextBlink = now + 1500 + rand() * 2500;
    this.nextFlick = now + 4000 + rand() * 6000;
    this.nextLook = now + 2000 + rand() * 3000;
    this.nextSniff = now + 2000 + rand() * 3000;
  }

  mood(now: number): Mood {
    if (now < this.happyUntil) return 'happy';
    return now - this.stirred >= SLEEP_AFTER ? 'asleep' : 'awake';
  }

  private wake(now: number) {
    if (this.mood(now) === 'asleep') this.wokeAt = now;
    this.stirred = now;
  }

  /** A click on it. */
  pet(now: number) {
    this.wake(now);
    this.wokeAt = -Infinity;
    this.happyUntil = now + HAPPY;
  }

  /** The pointer on it, or off it. */
  hover(now: number, on: boolean) {
    this.hovered = on;
    if (on) this.wake(now);
  }

  /** Where the pointer is from its head, in its own pixels as drawn (x to
   * the right of the picture); null: nowhere near. Close by, it wakes. */
  see(now: number, at: { x: number; y: number } | null) {
    if (!at) {
      this.looking = null;
      return;
    }
    const d = Math.hypot(at.x, at.y);
    if (d > 260) {
      this.looking = null;
      return;
    }
    if (d < 70) this.wake(now);
    if (this.mood(now) !== 'asleep') this.stirred = Math.max(this.stirred, now - SLEEP_AFTER / 2);
    this.looking = at.x < -10 ? -1 : at.x > 10 ? 1 : 0;
  }

  /** Off to another window: in the air until `until`. */
  leap(now: number, until: number) {
    this.wake(now);
    this.wokeAt = -Infinity;
    this.leapUntil = until;
    this.landedAt = until;
  }

  pose(now: number): Pose {
    const mood = this.mood(now);
    const pose: Pose = { ...REST };
    const t = now / 1000;

    if (now < this.leapUntil) {
      return { ...pose, leap: true, eyes: 'wide', tail: 0 };
    }
    const since = now - this.landedAt;
    if (since >= 0 && since < SQUASH + DUST) {
      pose.squash = since < SQUASH;
      pose.dust = since < SQUASH ? 1 : since < SQUASH + DUST / 2 ? 2 : 3;
    }

    // Breathing: slower asleep.
    const breath = mood === 'asleep' ? 5.2 : 3.4;
    pose.breath = Math.sin((t / breath) * Math.PI * 2) > 0 ? 1 : 0;

    // The tail.
    if (mood === 'asleep') {
      pose.tail = round(Math.sin(t * 0.6) * 0.35);
    } else if (mood === 'happy') {
      const wag = this.kind === 'dog' ? 14 : this.kind === 'bunny' ? 9 : 6;
      pose.tail = round(Math.sin(t * wag));
    } else {
      // A lazy sway, now and then a flick.
      const flick = Math.sin(t * 0.37) > 0.92 ? Math.sin(t * 7) * 0.6 : 0;
      pose.tail = round(Math.sin(t * 1.1) * 0.55 + flick);
    }

    // Eyes.
    let eyes: Eyes = 'open';
    const toSleep = this.stirred + SLEEP_AFTER - now;
    if (mood === 'asleep') {
      eyes = 'closed';
    } else if (mood === 'happy' || this.hovered) {
      eyes = 'happy';
      pose.blush = true;
    } else if (toSleep < YAWN) {
      // A yawn, just before it nods off.
      eyes = 'closed';
      pose.mouth = true;
    } else if (now - this.wokeAt < WAKING || toSleep < YAWN + 6000) {
      eyes = 'half';
    } else {
      if (now >= this.nextBlink) {
        this.blinkUntil = now + 140;
        // Now and then twice.
        this.nextBlink = now + (this.rand() < 0.2 ? 320 : 2200 + this.rand() * 4200);
      }
      if (now < this.blinkUntil) eyes = 'closed';
    }
    pose.eyes = eyes;
    if (mood === 'happy') pose.mouth = this.kind !== 'bunny';

    // An ear flick.
    if (mood !== 'asleep' && now >= this.nextFlick) {
      this.flickUntil = now + 180;
      this.nextFlick = now + 5000 + this.rand() * 9000;
    }
    pose.ear = now < this.flickUntil;

    // A bunny's nose, sniffing.
    if (this.kind === 'bunny' && mood !== 'asleep') {
      if (now >= this.nextSniff) {
        this.sniffUntil = now + 900;
        this.nextSniff = now + 2500 + this.rand() * 4000;
      }
      pose.sniff = now < this.sniffUntil && Math.floor(now / 110) % 2 === 0;
    }

    // Where it looks: at the pointer, or around.
    if (mood !== 'asleep') {
      if (now >= this.nextLook) {
        const r = this.rand();
        this.wander = r < 0.55 ? 0 : r < 0.78 ? -1 : 1;
        this.nextLook = now + 1800 + this.rand() * 3500;
      }
      pose.gaze = this.looking ?? this.wander;
    }
    return pose;
  }
}

/** The tail's sway in eighths: fewer poses, fewer redraws. */
function round(v: number): number {
  return Math.round(Math.max(-1, Math.min(1, v)) * 8) / 8;
}

/** The pose as a string: the same string, the same picture. */
export function key(p: Pose): string {
  return `${p.breath}${p.tail}${p.eyes}${p.gaze}${+p.ear}${+p.mouth}${+p.sniff}${+p.leap}${+p.squash}${p.dust}${+p.blush}`;
}
