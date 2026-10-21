import { headTags, jsonLd, llmsTxt, robotsTxt, sitemapXml, webManifest } from './seo.js';

const notFound = { path: '', title: 'Page not found · Unison', description: 'This page wandered off. Unison connects your Android phone and your Mac over Wi-Fi.' };

/** Fills the pages' placeholders from the site config and emits the SEO files (Plan 12). */
export default function seoPlugin(site) {
  const pageFor = file => (file.endsWith('privacy/index.html') ? site.pages[1] : file.endsWith('404.html') ? notFound : site.pages[0]);
  return {
    name: 'unison-seo',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        return html
          .replace('%SEO_HEAD%', headTags(site, pageFor(ctx.filename)))
          .replace('%JSON_LD%', `<script type="application/ld+json">${JSON.stringify(jsonLd(site))}</script>`)
          .replaceAll('%DMG_URL%', site.dmgUrl)
          .replaceAll('%RELEASES_URL%', site.releasesUrl)
          .replaceAll('%REPO_URL%', site.repo)
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
