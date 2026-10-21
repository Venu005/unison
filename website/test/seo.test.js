import { expect, test } from 'vitest';
import SITE from '../site.config.js';
import { absoluteUrl, headTags, jsonLd, sitemapXml, robotsTxt, llmsTxt, webManifest } from '../src/seo.js';

const privacy = SITE.pages[1];

test('absoluteUrl joins under the site url', () => {
  expect(absoluteUrl(SITE)).toBe('https://venu005.github.io/unison/');
  expect(absoluteUrl(SITE, 'privacy/')).toBe('https://venu005.github.io/unison/privacy/');
  expect(absoluteUrl(SITE, '/og-image.png')).toBe('https://venu005.github.io/unison/og-image.png');
});

test('headTags carries canonical, og and twitter for the page', () => {
  const h = headTags(SITE, privacy);
  expect(h).toContain('<link rel="canonical" href="https://venu005.github.io/unison/privacy/">');
  expect(h).toContain('property="og:image" content="https://venu005.github.io/unison/og-image.png"');
  expect(h).toContain('name="twitter:card" content="summary_large_image"');
  expect(h).toContain(`<title>${privacy.title}</title>`);
});

test('jsonLd is a free macOS app by Venusai while Play is not live', () => {
  const j = jsonLd(SITE);
  expect(j['@type']).toBe('SoftwareApplication');
  expect(j.operatingSystem).toBe('macOS');
  expect(j.offers).toMatchObject({ '@type': 'Offer', price: '0' });
  expect(j.author).toMatchObject({ name: 'Venusai', email: 'venusaiyalamanchili@gmail.com' });
  expect(j.downloadUrl).toBe(SITE.dmgUrl);
  expect(jsonLd({ ...SITE, playUrl: 'https://play.google.com/x' }).operatingSystem).toBe('macOS, Android');
});

test('sitemap lists both pages, robots points at it', () => {
  expect(sitemapXml(SITE)).toContain('<loc>https://venu005.github.io/unison/privacy/</loc>');
  expect(robotsTxt(SITE)).toContain('Sitemap: https://venu005.github.io/unison/sitemap.xml');
});

test('llms.txt follows llmstxt.org and says Android is coming soon', () => {
  const t = llmsTxt(SITE);
  expect(t.startsWith('# Unison\n\n> ')).toBe(true);
  expect(t).toMatch(/coming soon/i);
  expect(t).toContain('https://venu005.github.io/unison/privacy/');
  expect(t).toContain('https://github.com/Venu005/unison');
  expect(t).not.toContain('MacDroid');
});

test('webManifest uses the base path for start_url and icons', () => {
  const m = webManifest(SITE);
  expect(m.start_url).toBe('/unison/');
  expect(m.icons.map(i => i.src)).toEqual(['/unison/icon-192.png', '/unison/icon-512.png']);
});
