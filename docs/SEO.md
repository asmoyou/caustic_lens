# Search and Discovery

The primary website is `https://caustic.asmo.top/`. Canonical links, Open Graph URLs, JSON-LD identities, the sitemap and the optional `llms.txt` index use this origin. A `SITE_URL` build variable can override it for an independently deployed copy; credentials, query strings and fragments are rejected. GitHub Pages asset paths remain controlled separately by `GITHUB_PAGES=true`, while its pages canonicalize to the primary site.

Docker builds also accept `--build-arg SITE_URL=https://your-domain.example/`; their default is the same confirmed primary domain.

## Public Content

- `/`: the interactive workbench, with initial HTML containing its name and navigation before JavaScript starts.
- `/optics.html`: static, visible technical content explaining caustics, source models, coordinate conventions, supported outputs and the limits of the approximation. It works without JavaScript and links to primary references and the repository's tests.
- `/robots.txt` and `/sitemap.xml`: emitted during the Vite build.
- `/llms.txt`: a concise factual index for tools that choose to read it. It is not a required indexing protocol and does not guarantee inclusion in AI answers.
- `/social-preview.png`: a 1200 x 630 image captured from the working application with the bundled sample target. Regenerate locally with `node scripts/generate-social-image.mjs` while the dev server is running; `PREVIEW_URL` can point to a different local preview.

Metadata is emitted into the HTML response, not inserted only after JavaScript executes. Structured data describes the actual application and technical article; it contains no invented ratings or reviews. Development responses use `noindex, nofollow`; production builds allow indexing. No user-agent-specific content or hidden keyword blocks are used.

## Deployment Checks

Deploy the complete `dist/` output, including `optics.html` and discovery files. The Nginx configuration serves only real files and returns 404 for unknown paths; discovery files must never fall back to the application HTML. Hashed `/assets/` files retain long caching, while unversioned public images receive a shorter cache lifetime.

Robots directives apply at the origin root. A robots file under a GitHub project subpath cannot control the whole `github.io` origin; the custom-domain root deployment is the intended discovery endpoint.

After deployment, verify the primary domain serves the current HTML, canonical links and XML/plain-text discovery files. CDN rules must also allow crawling. Search Console verification and sitemap submission require the owner's account and are not provisioned by this repository. Search engines decide whether and when to crawl, index or cite the content.

Google's [AI features guidance](https://developers.google.com/search/docs/appearance/ai-features) applies ordinary SEO foundations to AI Overviews and AI Mode; no special AI markup is required. See also its [software application structured data guidance](https://developers.google.com/search/docs/appearance/structured-data/software-app). JSON-LD here describes entities; it does not promise eligibility for a specific rich-result presentation.

## Validation

`tests/seo.test.ts` verifies URL normalization, metadata identities and discovery-file agreement. `tests/e2e/discovery.spec.ts` checks HTTP resources, accessible friend links and the no-JavaScript document on desktop and mobile. Standard browser tests continue to cover the actual workbench.

CI also starts the production Nginx configuration and runs `npm run verify:site -- http://127.0.0.1:4174/` to verify metadata, resource MIME types, share-image dimensions, cache policy and real 404 responses. This check expects a production server, not Vite's SPA-fallback preview server.
