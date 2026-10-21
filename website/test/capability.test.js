import { expect, test } from 'vitest';
import { chooseQuality } from '../src/capability.js';

const base = { webgl: true, reducedMotion: false, width: 1440, coarsePointer: false, cores: 8 };

test('a normal desktop gets full', () => expect(chooseQuality(base)).toBe('full'));
test('no WebGL is static', () => expect(chooseQuality({ ...base, webgl: false })).toBe('static'));
test('reduced motion is static', () => expect(chooseQuality({ ...base, reducedMotion: true })).toBe('static'));
test('phones and touch-only small screens get lite', () => {
  expect(chooseQuality({ ...base, width: 390, coarsePointer: true })).toBe('lite');
  expect(chooseQuality({ ...base, width: 820, coarsePointer: true })).toBe('lite');
});
test('weak machines get lite', () => expect(chooseQuality({ ...base, cores: 2 })).toBe('lite'));
