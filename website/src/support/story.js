// The Support scene's timeline (Plan 13), kept apart from three.js so it can be tested: the robot waits, walks in with
// the chai, turns, hops into the bean bag, then idles, alternating a cheers (glass raised to the visitor) and a sip.

/** Seconds. */
export const STORY = Object.freeze({ delay: 0.6, walk: 3.0, turn: 0.7, hop: 0.9, cheers: 2.4, sip: 1.8, idleMin: 4.5, idleMax: 6.5 });

const PHASES = ['walk', 'turn', 'hop'];

/** Where the story is `t` seconds after the section came into view; `k` runs 0→1 within the phase. */
export function storyAt(t) {
  if (t < STORY.delay) return { phase: 'waiting', k: 0, seatedFor: 0 };
  let start = STORY.delay;
  for (const phase of PHASES) {
    if (t < start + STORY[phase]) return { phase, k: (t - start) / STORY[phase], seatedFor: 0 };
    start += STORY[phase];
  }
  return { phase: 'seated', k: 1, seatedFor: t - start };
}

/** The seated idle loop. Requests (a click on Sponsor) replace the current action; nothing runs before it sits. */
export function createIdle(random = Math.random) {
  let current = null, nextAt = null, nextKind = 'cheers';
  const gap = () => STORY.idleMin + random() * (STORY.idleMax - STORY.idleMin);
  const start = (action, now) => { current = { action, start: now }; nextAt = now + gap(); };
  return {
    request(kind, now, seated) {
      if (seated) start(kind, now);
    },
    tick(now, seated) {
      if (!seated) return { action: null, k: 0 };
      if (nextAt === null || now >= nextAt - 1e-9) { start(nextKind, now); nextKind = nextKind === 'cheers' ? 'sip' : 'cheers'; }
      const k = (now - current.start) / STORY[current.action];
      return k < 1 ? { action: current.action, k } : { action: null, k: 0 };
    },
  };
}
