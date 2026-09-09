/**
 * SEO + crawlability, generated from content.json at build time.
 *
 * Four jobs:
 *   1. the <head> — title, description, canonical, Open Graph, Twitter card
 *   2. JSON-LD structured data, so a machine reads facts rather than prose
 *   3. a full static rendering of the site's content inside the HTML
 *   4. robots.txt, sitemap.xml, llms.txt and a favicon
 *
 * ── Why (3) exists ────────────────────────────────────────────────────────
 * This site is a React Three Fiber app: served as-is, the document body is one
 * empty <div> and every word arrives via ~1.5MB of JavaScript. Googlebot will
 * render that and see the real thing, eventually. Almost nothing else will —
 * GPTBot, ClaudeBot, PerplexityBot, Bingbot's fast path, and every link-preview
 * unfurler read the HTML they are given and never execute a script. To those,
 * an unprerendered SPA is a blank page.
 *
 * So the build writes the content into the document as real, semantic HTML.
 * The inline <head> script sets data-js="on" before first paint, and the CSS
 * below hides the static copy whenever scripting is live — so a browser never
 * flashes it, and a crawler without JS gets the whole portfolio in the source.
 * It is the same content either way; the app is the enhanced view of it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(HERE, '..', 'src', 'assets');
const CONTENT = path.resolve(HERE, '..', 'src', 'content', 'content.json');

const readContent = () => JSON.parse(fs.readFileSync(CONTENT, 'utf8'));

/** HTML-escape. Content is authored by the site owner, but it contains &, <,
    quotes and em dashes as a matter of course. */
const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const trimSlash = (url) => String(url ?? '').replace(/\/+$/, '');

/** The share image keeps a stable, unhashed name so the <head> can name it
    without waiting to learn what the bundler called it. */
const OG_FILE = 'og-image';

function ogPath(content) {
  const ref = content.seo?.ogImage;
  if (!ref) return null;
  const ext = path.extname(ref).toLowerCase() || '.jpg';
  return { source: path.join(ASSETS, ref), fileName: `${OG_FILE}${ext}`, ext };
}

// ── structured data ────────────────────────────────────────────────────────

function jsonLd(content) {
  const { identity, projects, skillGroups, certifications, socials, seo } = content;
  const site = trimSlash(seo.siteUrl);
  const og = ogPath(content);
  const image = og ? `${site}/${og.fileName}` : undefined;

  const person = {
    '@type': 'Person',
    '@id': `${site}/#person`,
    name: identity.name,
    jobTitle: identity.role,
    description: identity.bio,
    email: `mailto:${identity.email}`,
    url: site,
    image,
    sameAs: socials.filter((s) => /^https?:/.test(s.href)).map((s) => s.href),
    knowsAbout: skillGroups.flatMap((group) => group.items.map((item) => item.name)),
    address: identity.location
      ? { '@type': 'PostalAddress', addressLocality: identity.location.split('—')[0].trim() }
      : undefined,
    hasCredential: certifications.map((cert) => ({
      '@type': 'EducationalOccupationalCredential',
      name: cert.title,
      credentialCategory: cert.badge,
      url: cert.credentialUrl || undefined,
      recognizedBy: { '@type': 'Organization', name: cert.issuer },
      validFrom: cert.date,
    })),
  };

  const work = projects.map((project, index) => ({
    '@type': 'SoftwareApplication',
    '@id': `${site}/#${project.id}`,
    position: index + 1,
    name: project.title,
    description: project.description,
    abstract: project.overview,
    applicationCategory: project.category,
    operatingSystem: project.platform,
    datePublished: project.year,
    url: project.link || `${site}/#work`,
    author: { '@id': `${site}/#person` },
    keywords: (project.tech ?? []).join(', '),
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      person,
      {
        '@type': 'WebSite',
        '@id': `${site}/#website`,
        url: site,
        name: seo.title,
        description: seo.description,
        inLanguage: 'en',
        publisher: { '@id': `${site}/#person` },
      },
      {
        '@type': 'ProfilePage',
        '@id': `${site}/#profile`,
        url: site,
        name: seo.title,
        about: { '@id': `${site}/#person` },
        isPartOf: { '@id': `${site}/#website` },
        primaryImageOfPage: image,
      },
      {
        '@type': 'ItemList',
        '@id': `${site}/#projects`,
        name: 'Projects',
        numberOfItems: work.length,
        itemListElement: work.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item,
        })),
      },
    ],
  };
}

// ── the <head> ─────────────────────────────────────────────────────────────

function head(content) {
  const { identity, seo } = content;
  const site = trimSlash(seo.siteUrl);
  const og = ogPath(content);
  const image = og ? `${site}/${og.fileName}` : '';
  const title = seo.title || `${identity.name} — ${identity.role}`;

  const tags = [
    `<link rel="canonical" href="${esc(site)}/" />`,
    `<meta name="description" content="${esc(seo.description)}" />`,
    seo.keywords?.length && `<meta name="keywords" content="${esc(seo.keywords.join(', '))}" />`,
    `<meta name="author" content="${esc(identity.name)}" />`,
    // max-image-preview:large is what turns a search result into one with a
    // picture; the rest just says "index everything, follow everything".
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`,

    `<meta property="og:type" content="profile" />`,
    `<meta property="og:site_name" content="${esc(identity.name)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(seo.description)}" />`,
    `<meta property="og:url" content="${esc(site)}/" />`,
    seo.locale && `<meta property="og:locale" content="${esc(seo.locale)}" />`,
    image && `<meta property="og:image" content="${esc(image)}" />`,
    image && `<meta property="og:image:alt" content="${esc(identity.name)}" />`,
    `<meta property="profile:first_name" content="${esc(identity.name.split(' ').slice(-1)[0])}" />`,

    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(seo.description)}" />`,
    image && `<meta name="twitter:image" content="${esc(image)}" />`,
    seo.twitter && `<meta name="twitter:creator" content="${esc(seo.twitter)}" />`,

    `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`,
    `<link rel="apple-touch-icon" href="/favicon.svg" />`,
    `<link rel="manifest" href="/site.webmanifest" />`,
    `<link rel="sitemap" type="application/xml" href="/sitemap.xml" />`,

    `<script type="application/ld+json">${JSON.stringify(jsonLd(content))}</script>`,
  ];

  return tags.filter(Boolean).join('\n  ');
}

// ── the static rendering ───────────────────────────────────────────────────

/**
 * The whole portfolio as plain HTML.
 *
 * Headings are a real outline (one h1, an h2 per section, h3 per project) —
 * that outline is most of what a crawler uses to work out what the page is
 * about, and it is the part a canvas can never provide.
 */
function staticBody(content) {
  const { identity, projects, skillGroups, achievements, certifications, socials, seo } = content;

  const list = (items, tag = 'li') =>
    (items ?? []).map((item) => `<${tag}>${esc(item)}</${tag}>`).join('');

  return `
<div id="static-content">
  <header>
    <!-- The name is the h1 here, where the visible page uses the display
         headline for it. A search for a person should match the one heading
         the document leads with, and "Mobile, backend & cloud." matches
         nobody's name. The headline follows immediately as the tagline. -->
    <h1>${esc(identity.name)} — ${esc(identity.role)}</h1>
    <p><strong>${esc(identity.headline?.join(' ') || identity.focus)}</strong></p>
    <p>${esc(identity.bio)}</p>
    <p>${esc(identity.focus)} · ${esc(identity.location)}</p>
    <p><a href="mailto:${esc(identity.email)}">${esc(identity.email)}</a></p>
  </header>

  <main>
    <section id="static-work">
      <h2>Work</h2>
      ${projects
        .map(
          (project) => `
      <article>
        <h3>${esc(project.title)}</h3>
        <p>${esc(project.category)} · ${esc(project.platform)} · ${esc(project.year)}</p>
        <p>${esc(project.description)}</p>
        ${project.overview ? `<p>${esc(project.overview)}</p>` : ''}
        ${project.role ? `<p>Role: ${esc(project.role)}</p>` : ''}
        ${project.tech?.length ? `<p>Built with: ${esc(project.tech.join(', '))}</p>` : ''}
        ${project.highlights?.length ? `<ul>${list(project.highlights)}</ul>` : ''}
        ${project.recognition?.length ? `<ul>${list(project.recognition)}</ul>` : ''}
      </article>`,
        )
        .join('')}
    </section>

    <section id="static-stack">
      <h2>Stack</h2>
      ${skillGroups
        .map(
          (group) => `
      <h3>${esc(group.label)}</h3>
      <ul>${list(group.items.map((item) => item.name))}</ul>`,
        )
        .join('')}
    </section>

    <section id="static-about">
      <h2>About ${esc(identity.name)}</h2>
      <p>${esc(identity.bio)}</p>
    </section>

    <section id="static-wins">
      <h2>Achievements</h2>
      <ul>
      ${achievements
        .map(
          (win) =>
            `<li><strong>${esc(win.title)}</strong> — ${esc(win.stat)} ${esc(win.statLabel)}. ${esc(win.description)}</li>`,
        )
        .join('')}
      </ul>
    </section>

    <section id="static-certs">
      <h2>Certifications</h2>
      <ul>
      ${certifications
        .map(
          (cert) =>
            `<li>${
              cert.credentialUrl
                ? `<a href="${esc(cert.credentialUrl)}" rel="noopener">${esc(cert.title)}</a>`
                : esc(cert.title)
            } — ${esc(cert.issuer)}, ${esc(cert.date)}</li>`,
        )
        .join('')}
      </ul>
    </section>

    <section id="static-contact">
      <h2>Contact</h2>
      <ul>
      ${socials
        .map((social) => `<li><a href="${esc(social.href)}" rel="me noopener">${esc(social.label)} — ${esc(social.handle)}</a></li>`)
        .join('')}
      </ul>
    </section>
  </main>

  <footer><p>${esc(seo.description)}</p></footer>
</div>`;
}

/**
 * Hidden the instant scripting is confirmed, which the theme script in <head>
 * already establishes before first paint — so this never flashes in a real
 * browser, and never has to be removed from under React.
 */
const STATIC_STYLE = `
    html[data-js='on'] #static-content { display: none !important; }
    #static-content {
      max-width: 46rem; margin: 0 auto; padding: 3rem 1.5rem 6rem;
      font: 16px/1.6 system-ui, sans-serif; color: #e9eaf0; background: #05060a;
    }
    #static-content h1 { font-size: 2.4rem; line-height: 1.1; margin: .4rem 0 1rem; }
    #static-content h2 { margin: 2.6rem 0 .6rem; font-size: 1.4rem; }
    #static-content h3 { margin: 1.6rem 0 .3rem; font-size: 1.1rem; }
    #static-content a { color: #8b93ff; }
    @media (prefers-color-scheme: light) {
      #static-content { color: #0a0b11; background: #f3f4f8; }
      #static-content a { color: #3b46d6; }
    }`;

// ── generated files ────────────────────────────────────────────────────────

/**
 * AI crawlers are named explicitly rather than left to the wildcard.
 *
 * A bare `User-agent: *  Allow: /` already permits them, but several of these
 * bots look for their own name first and some operators expect to see it — an
 * explicit Allow is the unambiguous version of the same answer. Flip any of
 * these to Disallow to opt out of that crawler specifically.
 */
function robots(content) {
  const site = trimSlash(content.seo.siteUrl);
  const bots = [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
    'ClaudeBot', 'Claude-Web', 'anthropic-ai', 'Claude-SearchBot',
    'PerplexityBot', 'Perplexity-User',
    'Google-Extended', 'Googlebot', 'Googlebot-Image', 'Bingbot',
    'Applebot', 'Applebot-Extended',
    'DuckDuckBot', 'Amazonbot', 'meta-externalagent', 'cohere-ai', 'YouBot',
  ];
  return `# ${content.identity.name} — ${content.seo.siteUrl}

User-agent: *
Allow: /

${bots.map((bot) => `User-agent: ${bot}\nAllow: /`).join('\n\n')}

Sitemap: ${site}/sitemap.xml
`;
}

function sitemap(content) {
  const site = trimSlash(content.seo.siteUrl);
  const today = new Date().toISOString().slice(0, 10);
  // One real URL. The sections are fragments of it, and listing fragments as
  // separate <url> entries is a well-known way to get a sitemap ignored.
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${site}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`.replace('www.sitemap.org', 'www.sitemaps.org');
}

/**
 * llms.txt — a plain-Markdown summary at a well-known path, for language
 * models that would otherwise have to infer the site from its markup.
 * See llmstxt.org.
 */
function llmsTxt(content) {
  const { identity, projects, skillGroups, achievements, certifications, socials, seo } = content;
  const site = trimSlash(seo.siteUrl);

  return `# ${identity.name}

> ${identity.role} — ${identity.bio}

Based in ${identity.location}. Focus: ${identity.focus}.
Contact: ${identity.email} · ${site}

## Projects

${projects
  .map(
    (project) =>
      `### ${project.title} (${project.year})\n` +
      `${project.category} · ${project.platform}. Built with ${(project.tech ?? []).join(', ')}.\n\n` +
      `${project.description}\n\n` +
      (project.overview ? `${project.overview}\n\n` : '') +
      (project.highlights?.length
        ? `${project.highlights.map((h) => `- ${h}`).join('\n')}\n`
        : ''),
  )
  .join('\n')}
## Stack

${skillGroups.map((g) => `- **${g.label}:** ${g.items.map((i) => i.name).join(', ')}`).join('\n')}

## Achievements

${achievements.map((a) => `- **${a.title}** (${a.stat} ${a.statLabel}) — ${a.description}`).join('\n')}

## Certifications

${certifications.map((c) => `- ${c.title} — ${c.issuer}, ${c.date}`).join('\n')}

## Links

${socials.map((s) => `- [${s.label}](${s.href})`).join('\n')}
`;
}

function favicon(content) {
  const accent = content.identity.accent || '#4f5bff';
  const initials = content.identity.name
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${esc(accent)}"/>
  <text x="32" y="43" font-family="Archivo, Helvetica, Arial, sans-serif" font-size="30"
        font-weight="800" text-anchor="middle" fill="#fff">${esc(initials)}</text>
</svg>
`;
}

function webmanifest(content) {
  return JSON.stringify(
    {
      name: content.seo.title,
      short_name: content.identity.name.split(' ')[0],
      description: content.seo.description,
      start_url: '/',
      display: 'standalone',
      background_color: '#05060a',
      theme_color: content.identity.accent || '#4f5bff',
      icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
    },
    null,
    2,
  );
}

// ── plugin ─────────────────────────────────────────────────────────────────

export function seoPlugin() {
  /** Files served in dev and emitted in build, so what you check locally is
      byte-for-byte what ships. */
  const generated = (content) => ({
    'robots.txt': { body: robots(content), type: 'text/plain; charset=utf-8' },
    'sitemap.xml': { body: sitemap(content), type: 'application/xml; charset=utf-8' },
    'llms.txt': { body: llmsTxt(content), type: 'text/plain; charset=utf-8' },
    'favicon.svg': { body: favicon(content), type: 'image/svg+xml' },
    'site.webmanifest': { body: webmanifest(content), type: 'application/manifest+json' },
  });

  return {
    name: 'portfolio-seo',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '');
        const file = generated(readContent())[name];
        if (!file) return next();
        res.setHeader('content-type', file.type);
        res.end(file.body);
      });

      // Editing content in the Studio should refresh what dev serves.
      server.watcher.add(CONTENT);
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const content = readContent();
        const title = content.seo.title || `${content.identity.name} — ${content.identity.role}`;

        return html
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
          // The template's own description is a developer note about the 3D
          // hero; it must not survive into the shipped <head>.
          .replace(/\n?\s*<meta name="description"[\s\S]*?\/>/g, '')
          .replace('</head>', `  ${head(content)}\n  <style>${STATIC_STYLE}\n  </style>\n</head>`)
          .replace('</body>', `  ${staticBody(content)}\n</body>`);
      },
    },

    generateBundle() {
      const content = readContent();

      for (const [fileName, file] of Object.entries(generated(content))) {
        this.emitFile({ type: 'asset', fileName, source: file.body });
      }

      const og = ogPath(content);
      if (og && fs.existsSync(og.source)) {
        this.emitFile({ type: 'asset', fileName: og.fileName, source: fs.readFileSync(og.source) });
      } else if (og) {
        this.warn(`og:image source not found: ${og.source}`);
      }
    },
  };
}
