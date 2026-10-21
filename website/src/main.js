import SITE from '../site.config.js';
import { chooseQuality } from './capability.js';

// The Google Play badge: a real link once the listing is live, until then a "coming soon" label.
for (const el of document.querySelectorAll('[data-play]')) {
  if (SITE.playUrl) {
    const a = document.createElement('a');
    a.className = el.className; a.href = SITE.playUrl; a.textContent = 'Get it on Google Play';
    el.replaceWith(a);
  } else {
    el.setAttribute('aria-disabled', 'true');
  }
}

// The demo video: set data-video-src on .player in index.html and the placeholder becomes a player.
for (const player of document.querySelectorAll('.player[data-video-src]')) {
  const src = player.dataset.videoSrc;
  if (!src) continue;
  const video = document.createElement('video');
  Object.assign(video, { src, controls: true, preload: 'none', playsInline: true });
  if (player.dataset.videoPoster) video.poster = player.dataset.videoPoster;
  player.replaceChildren(video);
}

// 3D scenes: chosen once per visit, each loaded only when its section comes near the screen.

const quality = chooseQuality({
  webgl: !!document.createElement('canvas').getContext('webgl2'),
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  width: innerWidth,
  coarsePointer: matchMedia('(pointer: coarse)').matches,
});
document.documentElement.dataset.quality = quality;
document.documentElement.dataset.pointer = matchMedia('(pointer: coarse)').matches ? 'coarse' : 'fine';

// "Download" starts the DMG download and brings up the install steps, which the visitor needs next.
for (const a of document.querySelectorAll('a[data-download]')) {
  a.addEventListener('click', () => setTimeout(() => document.getElementById('install')?.scrollIntoView({ behavior: 'smooth' }), 150));
}

/** Mounts a scene module when `section` is within a viewport of the screen; `static` only shows the still picture. */
export function mountWhenNear(section, loader, q) {
  if (!section) return;
  section.classList.add(q);
  if (q === 'static') return;
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    try {
      const { mount } = await loader();
      mount(section, q);
    } catch (err) {
      console.warn(`Unison: the ${section.id} scene didn't load, showing the still picture instead.`, err);
      section.classList.replace(q, 'static');
    }
  }, { rootMargin: '100% 0px' });
  io.observe(section);
}

mountWhenNear(document.getElementById('hero'), () => import('./scenes/hero.js'), quality);
mountWhenNear(document.getElementById('features'), () => import('./scenes/features.js'), quality);
mountWhenNear(document.getElementById('game'), () => import('./scenes/game.js'), quality);
