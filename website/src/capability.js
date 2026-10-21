/**
 * How much 3D a visitor gets (Plan 12). `static`: a still picture (no WebGL, or reduced motion is on).
 * `lite`: lighter scenes for phones, touch screens and weak machines. `full`: everything.
 */
export function chooseQuality({ webgl, reducedMotion, width, coarsePointer, cores }) {
  if (!webgl || reducedMotion) return 'static';
  if (width < 900 || coarsePointer || cores <= 4) return 'lite';
  return 'full';
}
