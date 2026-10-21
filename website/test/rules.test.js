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
