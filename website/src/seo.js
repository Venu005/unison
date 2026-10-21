// Everything search engines, link previews and AI assistants read, generated from the site config (Plan 12).
// Pure functions: the Vite plugin calls them at build time, and the tests call them directly.

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function absoluteUrl(site, path = '') {
  return site.url + String(path).replace(/^\//, '');
}

export function headTags(site, page) {
  const url = absoluteUrl(site, page.path), image = absoluteUrl(site, 'og-image.png');
  return [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta name="theme-color" content="${site.themeColor}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    `<meta property="og:title" content="${esc(page.title)}">`,
    `<meta property="og:description" content="${esc(page.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(page.title)}">`,
    `<meta name="twitter:description" content="${esc(page.description)}">`,
    `<meta name="twitter:image" content="${image}">`,
    `<link rel="icon" href="${site.base}favicon.svg" type="image/svg+xml">`,
    `<link rel="apple-touch-icon" href="${site.base}apple-touch-icon.png">`,
    `<link rel="manifest" href="${site.base}site.webmanifest">`,
    ...(page.path === '' && site.verification?.bing ? [`<meta name="msvalidate.01" content="${esc(site.verification.bing)}">`] : []),
  ].join('\n    ');
}

export function jsonLd(site) {
  const person = { '@type': 'Person', name: site.developer.name, email: site.developer.email, url: site.developer.url };
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.name,
    description: site.description,
    url: site.url,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: site.playUrl ? 'macOS, Android' : 'macOS',
    softwareVersion: site.version,
    downloadUrl: site.dmgUrl,
    image: absoluteUrl(site, 'og-image.png'),
    license: `${site.repo}/blob/main/LICENSE`,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: person,
    publisher: person,
  };
}

export function sitemapXml(site) {
  const urls = site.pages.map(p => `  <url><loc>${absoluteUrl(site, p.path)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(site) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl(site, 'sitemap.xml')}\n`;
}

export function llmsTxt(site) {
  const android = site.playUrl ? `Android: on Google Play (${site.playUrl})` : 'Android: coming soon to Google Play';
  return `# ${site.name}

> ${site.description}

${site.name} is a pair of native apps, a Mac menu-bar app and an Android app, that pair once by QR code and then talk directly over your local network. Nothing goes through a server.

## Key facts

- Free. No account, no ads, no analytics.
- No cloud: the phone and the Mac connect directly over your own Wi-Fi, encrypted end to end (mutual TLS with certificate pinning).
- Paired by scanning a QR code.
- Features: send files both ways (resumable), notifications with replies, shared clipboard (text, links and images), calls on the Mac (answer, decline, dial), browse the phone's photos (preview, save, drag out), screen mirroring with remote control, ring my phone, media controls.
- Mac: macOS 14 or later, a sandboxed menu-bar app, downloaded from GitHub (${site.dmgUrl}).
- ${android}.
- The Mac app isn't registered with Apple (that costs $99 a year), so macOS asks you to confirm it once: System Settings, Privacy & Security, Open Anyway. Steps: ${absoluteUrl(site, '#install')}

## Pages

- [Home](${absoluteUrl(site)}): what ${site.name} does and how to install it
- [Install steps](${absoluteUrl(site, '#install')}): getting the Mac app past Gatekeeper
- [Privacy policy](${absoluteUrl(site, 'privacy/')}): ${site.name} collects nothing

## Source

- [GitHub repository](${site.repo}), ${site.license} licence
- Developer: ${site.developer.name} (${site.developer.email})
`;
}

export function webManifest(site) {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: site.base,
    display: 'standalone',
    background_color: '#08090b',
    theme_color: site.themeColor,
    icons: [192, 512].map(n => ({ src: `${site.base}icon-${n}.png`, sizes: `${n}x${n}`, type: 'image/png' })),
  };
}
