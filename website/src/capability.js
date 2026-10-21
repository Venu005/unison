/**
 * How much 3D a visitor gets (Plan 12). `static`: a still picture (no WebGL, or reduced motion is on).
 * `lite`: lighter scenes for narrow and touch screens. `full`: everything. The core count is ignored: browsers fake it
 * (Brave randomises it for privacy), which put fast Macs on `lite`.
 */
export function chooseQuality({ webgl, reducedMotion, width, coarsePointer }) {
  if (!webgl || reducedMotion) return 'static';
  if (width < 900 || coarsePointer) return 'lite';
  return 'full';
}
