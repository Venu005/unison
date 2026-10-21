import SITE from '../site.config.js';

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
