import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Brain, SLEEP_AFTER, key } from '../src/client/brain.ts';
import { COATS, EDGE, HEIGHT, type Kind, REST, WIDTH, render } from '../src/client/sprite.ts';

const KINDS: Kind[] = ['cat', 'fox', 'dog', 'bunny'];
const POSES = [
  REST,
  { ...REST, eyes: 'closed' as const, breath: 1 as const, tail: -1 },
  { ...REST, eyes: 'happy' as const, blush: true, mouth: true, tail: 1 },
  { ...REST, leap: true, eyes: 'wide' as const },
  { ...REST, squash: true, dust: 1 as const },
  { ...REST, gaze: -1 as const, ear: true, sniff: true, dust: 3 as const },
];

test('every pet, in every coat and pose, fits its picture and lies on the edge', () => {
  for (const kind of KINDS) {
    for (const coat of Object.keys(COATS)) {
      for (const pose of POSES) {
        const g = render(kind, coat, pose);
        assert.equal(g.length, WIDTH * HEIGHT);
        // Every color it uses is in the coat.
        for (const t of g) if (t) assert.ok(COATS[coat][t], `${kind} ${coat}: ${t}`);
        // Its paws over the edge, nothing of it in the first or last column.
        const solid = (x: number, y: number) => {
          const t = g[y * WIDTH + x];
          return !!t && t !== 's' && t !== 'd' && t !== 'wh';
        };
        assert.ok(
          [...Array(WIDTH).keys()].some((x) => solid(x, EDGE)),
          `${kind}: paws over the edge`,
        );
        for (let y = 0; y < HEIGHT; y++) assert.ok(!solid(0, y) && !solid(WIDTH - 1, y), `${kind} ${coat}: room at the sides`);
      }
    }
  }
});

test('a pet is drawn the same way every time', () => {
  assert.deepEqual(render('fox', 'grey', REST), render('fox', 'grey', REST));
  assert.notDeepEqual(render('cat', 'ginger', REST), render('cat', 'ginger', { ...REST, eyes: 'closed' }));
});

test('an unknown coat is ginger', () => {
  assert.deepEqual(render('cat', 'plaid', REST), render('cat', 'ginger', REST));
});

const dice = () => 0.5;

test('left alone it yawns, then sleeps; the pointer close by wakes it', () => {
  const b = new Brain('cat', 0, dice);
  assert.equal(b.mood(1000), 'awake');
  const yawn = b.pose(SLEEP_AFTER - 500);
  assert.equal(yawn.eyes, 'closed');
  assert.equal(yawn.mouth, true);
  assert.equal(b.mood(SLEEP_AFTER + 1), 'asleep');
  assert.equal(b.pose(SLEEP_AFTER + 1).eyes, 'closed');
  b.see(SLEEP_AFTER + 2000, { x: 10, y: -20 });
  assert.equal(b.mood(SLEEP_AFTER + 2000), 'awake');
  // Drowsy at first.
  assert.equal(b.pose(SLEEP_AFTER + 2100).eyes, 'half');
});

test('it looks where the pointer is', () => {
  const b = new Brain('dog', 0, dice);
  b.see(10, { x: -80, y: 0 });
  assert.equal(b.pose(10).gaze, -1);
  b.see(20, { x: 80, y: 0 });
  assert.equal(b.pose(20).gaze, 1);
});

test('petted, it is happy for a while; a pup wags fast', () => {
  const b = new Brain('dog', 0, dice);
  b.pet(1000);
  const p = b.pose(1100);
  assert.equal(b.mood(1100), 'happy');
  assert.equal(p.eyes, 'happy');
  assert.equal(p.blush, true);
  const tails = new Set([1100, 1150, 1200, 1250, 1300].map((t) => b.pose(t).tail));
  assert.ok(tails.size >= 3, 'the tail moves');
  assert.equal(b.mood(5000), 'awake');
});

test('it leaps, then lands flat in a puff of dust', () => {
  const b = new Brain('bunny', 0, dice);
  b.leap(100, 600);
  assert.equal(b.pose(300).leap, true);
  const landed = b.pose(650);
  assert.equal(landed.leap, false);
  assert.equal(landed.squash, true);
  assert.ok(landed.dust > 0);
  assert.equal(b.pose(2000).dust, 0);
});

test('the same pose has the same key', () => {
  assert.equal(key(REST), key({ ...REST }));
  assert.notEqual(key(REST), key({ ...REST, gaze: 1 }));
});
