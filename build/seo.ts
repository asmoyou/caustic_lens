import type { HtmlTagDescriptor, Plugin } from 'vite';

export const SITE_URL = 'https://caustic.asmo.top/';
export const CONTENT_UPDATED = '2026-09-07';
export const SITE_NAME = 'Caustic Lens';
const repository = 'https://github.com/asmoyou/caustic_lens';
const author = { '@type': 'Person', name: '小白客', url: 'https://github.com/asmoyou' };

const pages = {
  workbench: {
    path: '', title: 'Caustic Lens - 焦散透镜设计与光学仿真',
    description: '在浏览器中将目标图像转换为焦散透镜网格，预览平行光与点光源的几何光学投影，导出 STL、OBJ、PLY、STEP 模型和设计报告。图像在浏览器内处理。',
  },
  optics: {
    path: 'optics.html', title: '焦散透镜与几何光学：原理、参数和仿真边界 - Caustic Lens',
    description: '了解焦散透镜、斯涅尔定律、平行光与点光源的区别，以及 Caustic Lens 的网格设计、1.5 m 默认算法焦距、受光面坐标和几何光学近似限制。',
  },
};

export function normalizeSiteUrl(input = SITE_URL): string {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('SITE_URL must be an absolute HTTP(S) URL without credentials, query or fragment');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}

export function createSeoTags(page: keyof typeof pages, siteUrl = SITE_URL, indexable = true): HtmlTagDescriptor[] {
  const root = normalizeSiteUrl(siteUrl);
  const info = pages[page];
  const url = new URL(info.path, root).href;
  const image = new URL('social-preview.png', root).href;
  const website = { '@type': 'WebSite', '@id': `${root}#website`, url: root, name: SITE_NAME, inLanguage: 'zh-CN' };
  const webpage = { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: info.title, description: info.description,
    inLanguage: 'zh-CN', isPartOf: { '@id': website['@id'] }, dateModified: CONTENT_UPDATED };
  const mainEntity = page === 'workbench' ? {
    '@type': 'WebApplication', '@id': `${root}#application`, name: SITE_NAME, url: root,
    description: info.description, applicationCategory: 'DesignApplication', operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript, WebGL 2 and Web Workers.', inLanguage: 'zh-CN',
    isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
    creator: author, image, sameAs: repository, softwareHelp: new URL('optics.html', root).href,
  } : {
    '@type': 'TechArticle', '@id': `${url}#article`, headline: '焦散透镜与几何光学', description: info.description,
    author, inLanguage: 'zh-CN', datePublished: CONTENT_UPDATED, dateModified: CONTENT_UPDATED,
    mainEntityOfPage: { '@id': webpage['@id'] }, image,
    citation: ['https://pbr-book.org/4ed/Light_Sources/Point_Lights',
      'https://pbr-book.org/4ed/Radiometry,_Spectra,_and_Color/Radiometry', repository],
  };
  const graph = [website, { ...webpage, mainEntity: { '@id': mainEntity['@id'] } }, mainEntity];
  const meta = (name: string, content: string): HtmlTagDescriptor => ({ tag: 'meta', attrs: { name, content }, injectTo: 'head' });
  const og = (property: string, content: string): HtmlTagDescriptor => ({ tag: 'meta', attrs: { property, content }, injectTo: 'head' });
  return [
    { tag: 'title', children: info.title, injectTo: 'head' },
    meta('description', info.description), meta('application-name', SITE_NAME), meta('author', '小白客'),
    meta('robots', indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'),
    { tag: 'link', attrs: { rel: 'canonical', href: url }, injectTo: 'head' },
    og('og:site_name', SITE_NAME), og('og:type', page === 'workbench' ? 'website' : 'article'), og('og:locale', 'zh_CN'),
    og('og:title', info.title), og('og:description', info.description), og('og:url', url), og('og:image', image),
    og('og:image:width', '1200'), og('og:image:height', '630'), og('og:image:type', 'image/png'),
    og('og:image:alt', 'Caustic Lens 焦散透镜工作台与计算得到的白光投影'),
    meta('twitter:card', 'summary_large_image'), meta('twitter:title', info.title), meta('twitter:description', info.description),
    meta('twitter:image', image), meta('twitter:image:alt', 'Caustic Lens 焦散透镜设计工作台'),
    { tag: 'script', attrs: { type: 'application/ld+json' },
      children: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c'), injectTo: 'head' },
  ];
}

function xmlText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function createDiscoveryFiles(siteUrl = SITE_URL) {
  const root = normalizeSiteUrl(siteUrl);
  const optics = new URL('optics.html', root).href;
  return {
    'robots.txt': `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', root).href}\n`,
    'sitemap.xml': `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[root, optics].map(url => `  <url><loc>${xmlText(url)}</loc><lastmod>${CONTENT_UPDATED}</lastmod></url>`).join('\n')}\n</urlset>\n`,
    'llms.txt': `# Caustic Lens

> 焦散透镜网格设计与几何光学仿真工作台，由小白客维护。正式网址：${root}

## 页面
- [工作台](${root})：图像输入、参数设置、三维预览与模型导出。
- [焦散透镜与几何光学](${optics})：模型原理、参数定义、坐标约定、验证依据和限制。
- [项目源码](${repository})：可核对算法实现与回归测试。

## 可核对的事实
- 图像在浏览器内处理，模型生成和投影计算使用 Web Worker。
- 当前生成尺寸为 100 x 100 mm，算法焦距默认 1.5 m；算法焦距与投影距离是两个独立参数。
- 逆向设计按平行光计算。平行光和理想点光源均可对现有网格进行前向投影计算。
- 点光源包含距离、X/Y 偏移、相对光强和接收屏范围设置；切换光源不会重新优化网格。
- 导出格式为 STL、OBJ、PLY、STEP 和 JSON；STEP 是多面实体，G-Code 尚未接入切片器。
- 设计报告包含实际参数和内嵌图像，可离线打开及打印。

## 仿真边界
投影来自当前网格的双界面折射和照度统计，不是直接粘贴目标图像。未模拟衍射、色散、菲涅耳损耗、吸收及多次内部反射，显示亮度不是绝对辐照度。默认光路视图压缩轴向间距，可选择实际距离比例。细条纹可能来自网格与有限采样误差。加工精度和实际光学效果仍需实物验证。

## 相关站点
- [Toy2Game 在线玩具箱](https://games.asmo.top/)
- [加工服务](https://www.asmo.top/)

内容核对日期：${CONTENT_UPDATED}
`,
  };
}

export function seoPlugin(siteUrl = SITE_URL): Plugin {
  const files = createDiscoveryFiles(siteUrl);
  let base = '/';
  let indexable = false;
  return {
    name: 'caustic-seo',
    configResolved(config) { base = config.base; indexable = config.command === 'build' && config.mode === 'production'; },
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) { return createSeoTags(context.path.endsWith('/optics.html') ? 'optics' : 'workbench', siteUrl, indexable); },
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(files)) this.emitFile({ type: 'asset', fileName, source });
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        const file = pathname.startsWith(base) ? pathname.slice(base.length) : '';
        if (!Object.hasOwn(files, file)) return next();
        response.setHeader('Content-Type', `${file.endsWith('.xml') ? 'application/xml' : 'text/plain'}; charset=utf-8`);
        response.setHeader('Cache-Control', 'no-cache');
        response.end(files[file as keyof typeof files]);
      });
    },
  };
}
