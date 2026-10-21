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

/** What the pointer is holding: one object or none. */
export function grabState() { return { held: null }; }

/** The robot ate `body`: if it was the held object, the hand is now empty, and nothing about it counts as thrown. */
export function eatBody(state, body) {
  body.eaten = 1; body.held = false; body.thrown = 0;
  if (state.held === body) state.held = null;
}

/** The pointer let go: whatever it still held becomes a throw. Returns that object, or null. */
export function releaseHeld(state) {
  const body = state.held;
  if (!body) return null;
  body.held = false; body.thrown = THROW_FRAMES; state.held = null;
  return body;
}

/** An object dropping back in starts fresh: never held, never thrown. */
export function respawnBody(body) { body.eaten = 0; body.held = false; body.thrown = 0; }

/** Grabbing needs a mouse or trackpad and a live scene; touch screens keep scrolling the page. */
export function canGrab({ quality, coarsePointer }) { return quality !== 'static' && !coarsePointer; }
