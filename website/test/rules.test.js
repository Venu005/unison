import { expect, test } from 'vitest';
import { catchDecision, THROW_FRAMES } from '../src/game/rules.js';

const near = { held: false, thrownFrames: 0, distance: 1, reach: 2, aboveBody: true };

test('a thrown object at the head is eaten', () => expect(catchDecision({ ...near, thrownFrames: 10 })).toBe('eat'));
test('a held object at the head is eaten', () => expect(catchDecision({ ...near, held: true })).toBe('eat'));
test('something that just fell on it bounces', () => expect(catchDecision(near)).toBe('bounce'));
test('out of reach or below the body does nothing', () => {
  expect(catchDecision({ ...near, thrownFrames: 10, distance: 3 })).toBe('none');
  expect(catchDecision({ ...near, thrownFrames: 10, aboveBody: false })).toBe('none');
});
test('a throw counts for 2.5 s at 60 fps', () => expect(THROW_FRAMES).toBe(150));

import { grabState, eatBody, releaseHeld, respawnBody, canGrab } from '../src/game/rules.js';
const body = () => ({ held: false, eaten: 0, thrown: 0 });

test('letting go after the held object was eaten marks nothing as thrown', () => {
  const state = grabState(), b = body();
  state.held = b; b.held = true;
  eatBody(state, b);
  expect(state.held).toBe(null);
  expect(releaseHeld(state)).toBe(null);
  expect(b.thrown).toBe(0);
});
test('releasing a held object makes it a throw', () => {
  const state = grabState(), b = body();
  state.held = b; b.held = true;
  expect(releaseHeld(state)).toBe(b);
  expect(b).toMatchObject({ held: false, thrown: THROW_FRAMES });
});
test('a respawned object is never still thrown', () => {
  const b = { ...body(), eaten: 40, thrown: 77 };
  respawnBody(b);
  expect(b).toMatchObject({ eaten: 0, thrown: 0, held: false });
});
test('anyone with a mouse can grab; touch and still pictures cannot', () => {
  expect(canGrab({ quality: 'full', coarsePointer: false })).toBe(true);
  expect(canGrab({ quality: 'lite', coarsePointer: false })).toBe(true);
  expect(canGrab({ quality: 'lite', coarsePointer: true })).toBe(false);
  expect(canGrab({ quality: 'static', coarsePointer: false })).toBe(false);
});
