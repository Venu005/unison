import { applySupport } from './support.js';
import { headTags, jsonLd, llmsTxt, robotsTxt, sitemapXml, webManifest } from './seo.js';

const notFound = { path: '', title: 'Page not found · Unison', description: 'This page wandered off. Unison connects your Android phone and your Mac over Wi-Fi.' };

/** Fills the pages' placeholders from the site config and emits the SEO files (Plan 12). */
export default function seoPlugin(site) {
  const pageFor = file => (file.endsWith('privacy/index.html') ? site.pages[1] : file.endsWith('404.html') ? notFound : site.pages[0]);
  return {
    name: 'unison-seo',
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        return (await applySupport(html, site))
          .replace('%SEO_HEAD%', headTags(site, pageFor(ctx.filename)))
          .replace('%JSON_LD%', `<script type="application/ld+json">${JSON.stringify(jsonLd(site))}</script>`)
          .replaceAll('%DMG_URL%', site.dmgUrl)
          .replace(/<a class="([^"]*)" href="%PLAY_URL%" data-play>[^<]*<\/a>/g, (tag, cls) => (site.playUrl ? tag : `<span class="${cls}" data-play aria-disabled="true">Coming soon to Google Play</span>`))
          .replace(/<a href="%PLAY_URL%">Google Play<\/a>/g, m => (site.playUrl ? m : 'Google Play (coming soon)'))
          .replaceAll('%PLAY_URL%', site.playUrl ?? '')
          .replaceAll('%RELEASES_URL%', site.releasesUrl)
          .replaceAll('%REPO_URL%', site.repo)
          .replaceAll('%DEV_URL%', site.developer.url)
          .replaceAll('%BASE_URL%', site.base);
      },
    },
    generateBundle() {
      const emit = (fileName, source) => this.emitFile({ type: 'asset', fileName, source });
      emit('sitemap.xml', sitemapXml(site));
      emit('robots.txt', robotsTxt(site));
      emit('llms.txt', llmsTxt(site));
      emit('site.webmanifest', JSON.stringify(webManifest(site), null, 2));
    },
  };
}
