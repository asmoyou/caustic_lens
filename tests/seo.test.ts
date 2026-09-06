import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createDiscoveryFiles, createSeoTags, normalizeSiteUrl, SITE_URL } from '../build/seo';

test('canonical URLs and structured data use the confirmed primary domain', () => {
  for (const page of ['workbench', 'optics'] as const) {
    const tags = createSeoTags(page);
    const canonical = tags.find(tag => tag.tag === 'link' && tag.attrs?.rel === 'canonical')!.attrs!.href;
    assert.equal(canonical, page === 'workbench' ? SITE_URL : `${SITE_URL}optics.html`);
    assert.equal(tags.filter(tag => tag.tag === 'title').length, 1);
    const graph = JSON.parse(tags.find(tag => tag.tag === 'script')!.children as string)['@graph'];
    assert.equal(graph[1].url, canonical);
    assert.equal(graph[2]['@type'], page === 'workbench' ? 'WebApplication' : 'TechArticle');
    assert.ok(!('aggregateRating' in graph[2]));
    assert.ok(!('review' in graph[2]));
  }
  assert.equal(createSeoTags('workbench', SITE_URL, false).find(tag => tag.attrs?.name === 'robots')!.attrs!.content, 'noindex, nofollow');
});

test('discovery files agree with canonical URLs, including an alternate deployment path', () => {
  const root = normalizeSiteUrl('https://example.test/tools/lens');
  const files = createDiscoveryFiles(root);
  const doc = new JSDOM(files['sitemap.xml'], { contentType: 'application/xml' }).window.document;
  assert.deepEqual(Array.from(doc.querySelectorAll('loc')).map(node => node.textContent), [root, `${root}optics.html`]);
  assert.ok(files['robots.txt'].includes(`Sitemap: ${root}sitemap.xml`));
  assert.ok(files['llms.txt'].includes(`${root}optics.html`));
  assert.ok(files['llms.txt'].includes('1.5 m'));
});

test('invalid canonical origins fail loudly instead of emitting misleading metadata', () => {
  for (const url of ['relative/path', 'javascript:alert(1)', 'https://user:password@example.test/', 'https://example.test/?tracking=1', 'https://example.test/#section']) {
    assert.throws(() => normalizeSiteUrl(url));
  }
});
