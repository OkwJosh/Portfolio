/**
 * The site's content, resolved from `src/content/content.json`.
 *
 * Nothing in here is authored by hand any more — content.json is the single
 * source of truth and is edited through the Content Studio (`npm run studio`).
 * This module's only job is to turn that plain JSON into the exact shapes the
 * components already consume, which is why every export below is still a bare
 * object/array with the same keys it had when the data lived inline.
 */
import content from '../content/content.json';

/**
 * Every file under src/assets, keyed by its path relative to that directory.
 *
 * A glob rather than a `new URL(..., import.meta.url)` per asset, because the
 * filenames now arrive as strings at runtime and Vite can only rewrite a URL
 * it can see statically. `query: '?url'` keeps the emit-and-hash behaviour the
 * old helpers had — no base64 inlining, so the same file referenced from three
 * places is still downloaded once.
 *
 * The consequence worth knowing: an image sitting in src/assets is bundled
 * whether or not content.json points at it. That is deliberate — it means you
 * can drop a file in through the Studio and reference it without a code change.
 */
const FILES = import.meta.glob('../assets/**/*.{png,jpg,jpeg,webp,avif,gif,svg,pdf}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const ASSETS = Object.fromEntries(
  Object.entries(FILES).map(([path, url]) => [path.replace('../assets/', ''), url]),
);

/**
 * Resolve one asset reference from content.json.
 *
 * Absolute URLs and site-root paths pass straight through, so a field can hold
 * a CDN link just as happily as a local filename. An unknown local filename
 * resolves to undefined rather than a broken path: every consumer already
 * guards on a missing image (the logo grid falls back to a monogram), and a
 * 404'd <img> is a worse failure than no <img> at all.
 */
function asset(ref) {
  if (!ref) return undefined;
  if (/^(https?:)?\/\/|^data:|^\//.test(ref)) return ref;
  const hit = ASSETS[ref];
  if (!hit && import.meta.env.DEV) {
    console.warn(`[content] asset not found in src/assets: ${ref}`);
  }
  return hit;
}

export const seo = content.seo;

export const identity = {
  ...content.identity,
  portrait: asset(content.identity.portrait),
  resume: asset(content.identity.resume),
};

export const projects = content.projects.map((project) => ({
  ...project,
  image: asset(project.image),
  // Optional — the detail view falls back to [image] when it is empty, so an
  // empty array has to stay empty rather than becoming [undefined].
  gallery: (project.gallery ?? []).map(asset).filter(Boolean),
}));

export const skillGroups = content.skillGroups.map((group) => ({
  ...group,
  items: group.items.map((item) => ({ ...item, logo: asset(item.logo) })),
}));

export const socials = content.socials;

export const certifications = content.certifications.map((cert) => ({
  ...cert,
  logo: asset(cert.logo),
}));

export const achievements = content.achievements;
