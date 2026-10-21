// The one place the site's identity and URLs live (Plan 12). Renaming the repo or adding a domain
// means editing `url` and `base` here; everything else (canonical, OG, sitemap, JSON-LD, llms.txt) follows.
const repo = 'https://github.com/Venu005/unison';

export default {
  name: 'Unison',
  tagline: 'Your phone lives here now.',
  description:
    'Unison connects your Android phone and your Mac over your own Wi-Fi: files, notifications, clipboard, calls and your screen. Free. No account, no cloud.',
  url: 'https://venu005.github.io/unison/',
  base: '/unison/',
  repo,
  dmgUrl: `${repo}/releases/latest/download/Unison.dmg`,
  releasesUrl: `${repo}/releases/latest`,
  // null until the Play listing is live: the page shows a "Coming soon to Google Play" badge instead of a link.
  playUrl: null,
  version: '0.4.0',
  developer: { name: 'Venusai', email: 'venusaiyalamanchili@gmail.com' },
  license: 'MIT',
  // Search-engine ownership proofs. Google's is the file public/google<token>.html; Bing reads public/BingSiteAuth.xml
  // or this code as a meta tag on the home page.
  verification: { bing: 'CD613607B586A3B1587004B1A995141B' },
  themeColor: '#F9C9A6',
  pages: [
    {
      path: '',
      title: 'Unison: your Android phone on your Mac, over Wi-Fi',
      description:
        'Send files both ways, see and answer notifications, share the clipboard, take calls and mirror your phone on your Mac. Free, no account, no cloud.',
    },
    {
      path: 'privacy/',
      title: 'Privacy policy · Unison',
      description: 'Unison collects nothing. Everything moves directly between your phone and your Mac over your local network.',
    },
  ],
};
