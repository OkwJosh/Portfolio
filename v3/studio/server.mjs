/**
 * Content Studio — the local editor for content.json.
 *
 * Runs three things at once:
 *   1. this HTTP server, which reads and writes src/content/content.json
 *   2. a Vite dev server, so the panel on the right is the actual site
 *   3. on demand, `vite build` + `firebase deploy`, streamed back to the UI
 *
 * Deliberately dependency-free — node builtins only. The studio is a tool for
 * one person on one machine, and a build step of its own would be one more
 * thing to keep working for no benefit.
 *
 * SECURITY: binds to 127.0.0.1 only, and must stay that way. It writes to the
 * repo and can trigger a production deploy; there is no auth because there is
 * no remote surface.
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const V3 = path.resolve(HERE, '..');
/**
 * The editor's UI lives in public/studio, not next to this file.
 *
 * It has to be reachable two ways: served from here when you run the Studio
 * locally, and shipped verbatim into dist/studio by Vite so the same editor is
 * available at /studio on the live site. Keeping one copy in public/ is what
 * stops the local and hosted editors drifting apart.
 */
const UI = path.resolve(V3, 'public', 'studio');
const REPO = path.resolve(V3, '..');
const CONTENT = path.join(V3, 'src', 'content', 'content.json');
const ASSETS = path.join(V3, 'src', 'assets');
const BACKUPS = path.join(HERE, '.backups');

const STUDIO_PORT = Number(process.env.STUDIO_PORT) || 5180;
const PREVIEW_PORT = Number(process.env.PREVIEW_PORT) || 5179;

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg']);
const DOC_EXT = new Set(['.pdf']);
const ALLOWED_EXT = new Set([...IMAGE_EXT, ...DOC_EXT]);
/** 12MB. A portfolio screenshot that exceeds this wants resizing, not uploading. */
const MAX_UPLOAD = 12 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

// ── helpers ────────────────────────────────────────────────────────────────

const json = (res, code, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
};

const readBody = (req, limit = MAX_UPLOAD) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('Payload too large'), { code: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

/**
 * Resolve an asset reference to a real path, refusing anything that escapes
 * src/assets. The refs come from a local UI, but a path-traversal bug in a
 * tool that also runs `firebase deploy` is not one to leave lying around.
 */
function resolveAsset(ref) {
  const clean = String(ref ?? '').replace(/^[\\/]+/, '');
  if (!clean || clean.includes('\0')) return null;
  const full = path.resolve(ASSETS, clean);
  const rel = path.relative(ASSETS, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return full;
}

/** Atomic-ish write: a crash mid-save leaves the previous file intact. */
async function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, file);
}

/** Snapshot before every save, newest 20 kept. Cheap insurance on real content. */
async function backup() {
  try {
    const current = await fs.readFile(CONTENT);
    await fs.mkdir(BACKUPS, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.writeFile(path.join(BACKUPS, `content-${stamp}.json`), current);
    const kept = (await fs.readdir(BACKUPS)).filter((f) => f.endsWith('.json')).sort();
    await Promise.all(
      kept.slice(0, Math.max(0, kept.length - 20)).map((f) => fs.rm(path.join(BACKUPS, f))),
    );
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('[studio] backup failed:', error.message);
  }
}

/**
 * Structural check before anything reaches disk.
 *
 * Not a full schema — the UI can only produce the right shape. This catches
 * the case that actually matters: a truncated or hand-mangled request writing
 * a file that then fails the site's build.
 */
function validate(data) {
  const problems = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['Root must be an object'];
  for (const key of ['identity', 'seo']) {
    if (!data[key] || typeof data[key] !== 'object' || Array.isArray(data[key])) {
      problems.push(`"${key}" must be an object`);
    }
  }
  for (const key of ['projects', 'skillGroups', 'socials', 'certifications', 'achievements']) {
    if (!Array.isArray(data[key])) problems.push(`"${key}" must be an array`);
  }
  if (typeof data.identity?.name !== 'string' || !data.identity.name.trim()) {
    problems.push('identity.name cannot be empty');
  }
  const ids = (Array.isArray(data.projects) ? data.projects : []).map((p) => p?.id);
  if (new Set(ids).size !== ids.length) problems.push('project ids must be unique');
  if (ids.some((id) => !id || !/^[a-z0-9-]+$/.test(id))) {
    problems.push('project ids must be lowercase letters, numbers and dashes');
  }
  return problems;
}

async function listAssets() {
  const walk = async (dir, prefix = '') => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const out = [];
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        out.push(...(await walk(path.join(dir, entry.name), rel)));
      } else if (ALLOWED_EXT.has(path.extname(entry.name).toLowerCase())) {
        const stat = await fs.stat(path.join(dir, entry.name));
        out.push({
          ref: rel,
          size: stat.size,
          kind: IMAGE_EXT.has(path.extname(entry.name).toLowerCase()) ? 'image' : 'doc',
        });
      }
    }
    return out;
  };
  return (await walk(ASSETS)).sort((a, b) => a.ref.localeCompare(b.ref));
}

// ── long-running jobs (build / deploy), streamed over SSE ──────────────────

/** Only one at a time — two concurrent `firebase deploy`s race for the site. */
let job = null;

function runJob(steps, res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  if (job) {
    send('error', { message: 'A publish is already running.' });
    res.end();
    return;
  }

  job = { cancelled: false, child: null };
  let index = 0;

  const next = () => {
    if (index >= steps.length) {
      send('done', { ok: true });
      job = null;
      res.end();
      return;
    }
    const step = steps[index++];
    send('step', { label: step.label, index, total: steps.length });

    // shell:true because npm and firebase are .cmd shims on Windows and are
    // not directly executable by spawn.
    const child = spawn(step.command, { cwd: step.cwd, shell: true, windowsHide: true });
    job.child = child;

    child.stdout.on('data', (d) => send('log', { text: d.toString() }));
    child.stderr.on('data', (d) => send('log', { text: d.toString() }));
    child.on('error', (error) => {
      send('error', { message: `${step.label}: ${error.message}` });
      job = null;
      res.end();
    });
    child.on('close', (code) => {
      if (code !== 0) {
        send('error', { message: `${step.label} exited with code ${code}` });
        job = null;
        res.end();
        return;
      }
      next();
    });
  };

  res.on('close', () => {
    // The browser navigated away mid-deploy. Let it finish — killing a
    // half-uploaded hosting release is worse than losing the log.
    if (job) job.detached = true;
  });

  next();
}

// ── routes ─────────────────────────────────────────────────────────────────

async function handle(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${STUDIO_PORT}`);
  const { pathname } = url;

  if (pathname === '/api/content' && req.method === 'GET') {
    const raw = await fs.readFile(CONTENT, 'utf8');
    return json(res, 200, { content: JSON.parse(raw), previewPort: PREVIEW_PORT });
  }

  if (pathname === '/api/content' && req.method === 'PUT') {
    const body = await readBody(req, 4 * 1024 * 1024);
    let parsed;
    try {
      parsed = JSON.parse(body.toString('utf8'));
    } catch {
      return json(res, 400, { error: 'Body is not valid JSON' });
    }
    const problems = validate(parsed);
    if (problems.length) return json(res, 400, { error: problems.join('; ') });

    await backup();
    await writeAtomic(CONTENT, `${JSON.stringify(parsed, null, 2)}\n`);
    return json(res, 200, { ok: true, savedAt: new Date().toISOString() });
  }

  if (pathname === '/api/assets' && req.method === 'GET') {
    return json(res, 200, { assets: await listAssets() });
  }

  if (pathname === '/api/assets' && req.method === 'POST') {
    const name = url.searchParams.get('name') ?? '';
    const dir = url.searchParams.get('dir') ?? '';
    // Filenames become part of the bundle; keep them boring and predictable.
    const safe = path
      .basename(name)
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^[-.]+/, '');
    const ext = path.extname(safe).toLowerCase();
    if (!safe || !ALLOWED_EXT.has(ext)) {
      return json(res, 400, { error: `Unsupported file type: ${ext || '(none)'}` });
    }
    if (dir && dir !== 'logos') return json(res, 400, { error: 'dir must be empty or "logos"' });

    const ref = dir ? `${dir}/${safe}` : safe;
    const target = resolveAsset(ref);
    if (!target) return json(res, 400, { error: 'Bad filename' });

    const body = await readBody(req);
    if (!body.length) return json(res, 400, { error: 'Empty upload' });

    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
    return json(res, 200, { ok: true, ref });
  }

  if (pathname === '/api/asset' && req.method === 'GET') {
    const file = resolveAsset(url.searchParams.get('ref'));
    if (!file) return json(res, 400, { error: 'Bad ref' });
    try {
      await fs.access(file);
    } catch {
      return json(res, 404, { error: 'Not found' });
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    return createReadStream(file).pipe(res);
  }

  if (pathname === '/api/publish' && req.method === 'GET') {
    return runJob(
      [
        { label: 'Building the site', command: 'npm run build', cwd: V3 },
        {
          label: 'Deploying to Firebase Hosting',
          command: 'firebase deploy --only hosting',
          cwd: REPO,
        },
      ],
      res,
    );
  }

  if (pathname === '/api/build' && req.method === 'GET') {
    return runJob([{ label: 'Building the site', command: 'npm run build', cwd: V3 }], res);
  }

  // ── static: the studio UI itself ──
  // /studio/app.js and /app.js both resolve, so the same <script src> works
  // whether the page is served from here or from dist/studio on the live site.
  const file = pathname === '/' ? '/index.html' : pathname.replace(/^\/studio\//, '/');
  const target = path.resolve(UI, `.${file}`);
  if (!target.startsWith(UI)) return json(res, 403, { error: 'Forbidden' });
  try {
    const data = await fs.readFile(target);
    res.writeHead(200, {
      'content-type': MIME[path.extname(target).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    return res.end(data);
  } catch {
    return json(res, 404, { error: 'Not found' });
  }
}

const server = createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error('[studio]', error);
    if (!res.headersSent) json(res, error.code === 413 ? 413 : 500, { error: error.message });
    else res.end();
  });
});

// ── boot ───────────────────────────────────────────────────────────────────

const preview = spawn(`npx vite --port ${PREVIEW_PORT} --strictPort`, {
  cwd: V3,
  shell: true,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
preview.stdout.on('data', (d) => process.stdout.write(`[preview] ${d}`));
preview.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`));

const shutdown = () => {
  preview.kill();
  server.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(STUDIO_PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  Content Studio');
  console.log(`  editor    http://localhost:${STUDIO_PORT}`);
  console.log(`  preview   http://localhost:${PREVIEW_PORT}`);
  console.log('');
  console.log('  Ctrl+C to stop both.');
  console.log('');
});
