import { expect, test } from 'vitest';
import { STORY, storyAt, createIdle } from '../src/support/story.js';

test('phases run waiting → walk → turn → hop → seated', () => {
  expect(storyAt(0).phase).toBe('waiting');
  const walk = storyAt(0.6 + 1.5);
  expect(walk.phase).toBe('walk');
  expect(walk.k).toBeCloseTo(0.5, 9);
  expect(storyAt(0.6 + 3.0 + 0.35).phase).toBe('turn');
  expect(storyAt(0.6 + 3.7 + 0.45).phase).toBe('hop');
  const seated = storyAt(10);
  expect(seated).toMatchObject({ phase: 'seated', k: 1 });
  expect(seated.seatedFor).toBeCloseTo(10 - 5.2, 9);
  expect(STORY).toEqual({ delay: 0.6, walk: 3.0, turn: 0.7, hop: 0.9, cheers: 2.4, sip: 1.8, idleMin: 4.5, idleMax: 6.5 });
});

test('the first seated action is cheers, then they alternate', () => {
  const idle = createIdle(() => 0);
  expect(idle.tick(5.2, true).action).toBe('cheers');
  expect(idle.tick(5.2 + 4.5, true).action).toBe('sip');
  expect(idle.tick(5.2 + 9.0, true).action).toBe('cheers');
});

test('a sip requested before seated is ignored', () => {
  const idle = createIdle(() => 0);
  idle.request('sip', 1, false);
  expect(idle.tick(1.1, false).action).toBe(null);
  expect(idle.tick(5.2, true).action).toBe('cheers');
});

test('a click restarts the sip', () => {
  const idle = createIdle(() => 0);
  idle.tick(5.2, true);
  idle.request('sip', 20, true);
  expect(idle.tick(20.9, true)).toMatchObject({ action: 'sip' });
  expect(idle.tick(20.9, true).k).toBeCloseTo(0.5, 9);
  expect(idle.tick(21.9, true).action).toBe(null);
});
