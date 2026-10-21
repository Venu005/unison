/** How long a released object still counts as "thrown": 2.5 s at 60 fps (Plan 12). */
export const THROW_FRAMES = 150;

/**
 * What happens when an object reaches the robot's head. Only something you're holding or just threw is a catch;
 * an object that merely falls on it (a drop-in or a respawn) bounces off, so the robot never feeds itself.
 */
export function catchDecision({ held, thrownFrames, distance, reach, aboveBody }) {
  if (distance >= reach || !aboveBody) return 'none';
  return held || thrownFrames > 0 ? 'eat' : 'bounce';
}
