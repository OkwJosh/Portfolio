/**
 * Backend: GitHub, for the hosted Studio at /studio.
 *
 * There is no server. The page talks to api.github.com directly — GitHub's
 * REST API sends permissive CORS headers, so a browser can read and commit
 * with nothing in between. Saving commits content.json to the repo, the push
 * triggers the deploy workflow, and the site is rebuilt from scratch: static
 * HTML, JSON-LD, llms.txt and sitemap all regenerated. That is the whole point
 * of routing edits through git rather than a live database — what crawlers
 * read can never drift from what the site says.
 *
 * ── About the token ───────────────────────────────────────────────────────
 * A GitHub fine-grained token, scoped to this one repository with Contents
 * read/write, kept in this browser's localStorage. It is sent only to
 * api.github.com. That means: anyone with your unlocked device can edit the
 * site, and the token has to be re-entered when it expires or on a new device.
 * Both are the accepted cost of having no backend to hold it instead.
 *
 * Revoke at any time: github.com/settings/personal-access-tokens
 */

const STORE_KEY = 'oj-studio-gh';

export const DEFAULTS = {
  owner: 'OkwJosh',
  repo: 'Portfolio',
  branch: 'main',
  contentPath: 'v3/src/content/content.json',
  assetsPath: 'v3/src/assets',
};

const API = 'https://api.github.com';

// ── base64 <-> UTF-8, correctly ────────────────────────────────────────────
// The content is full of em dashes and interpunct separators; btoa/atob alone
// mangle anything outside Latin-1.

const encode = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const decode = (b64) => {
  const binary = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const bytesToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Chunked: String.fromCharCode(...bytes) blows the argument limit on
  // anything above a few hundred KB, which is most images.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

// ── credentials ────────────────────────────────────────────────────────────

export function readCreds() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

export function writeCreds(creds) {
  localStorage.setItem(STORE_KEY, JSON.stringify(creds));
}

export function clearCreds() {
  localStorage.removeItem(STORE_KEY);
}

// ── the backend ────────────────────────────────────────────────────────────

export function createGitHubBackend(creds) {
  const { token, owner, repo, branch, contentPath, assetsPath } = { ...DEFAULTS, ...creds };
  const base = `${API}/repos/${owner}/${repo}`;

  /** sha of the content file as we last saw it — GitHub needs it to accept a
      write, and it is what makes a concurrent edit fail loudly instead of
      silently overwriting. */
  let contentSha = null;
  const downloadUrls = new Map();

  async function call(path, options = {}) {
    const res = await fetch(path.startsWith('http') ? path : `${base}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });

    if (res.status === 401) throw new Error('That token was rejected. It may have expired.');
    if (res.status === 403) {
      throw new Error('GitHub refused the request — check the token has Contents: read and write.');
    }
    if (res.status === 404) {
      throw new Error(`Not found: ${path}. Check the repository and branch are right.`);
    }
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.message ?? `GitHub returned ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  }

  return {
    name: 'github',
    label: `${owner}/${repo}`,
    preview: null,

    /** Cheap credential check, so a bad token fails at sign-in and not on save. */
    async verify() {
      const repoInfo = await call('');
      if (!repoInfo.permissions?.push) {
        throw new Error('That token can read this repo but not write to it.');
      }
      return repoInfo;
    },

    async load() {
      const file = await call(
        `/contents/${contentPath}?ref=${encodeURIComponent(branch)}&t=${Date.now()}`,
      );
      contentSha = file.sha;
      return { content: JSON.parse(decode(file.content)) };
    },

    async save(content) {
      const body = {
        message: `content: update from Studio\n\nEdited at ${new Date().toISOString()}`,
        content: encode(`${JSON.stringify(content, null, 2)}\n`),
        branch,
        sha: contentSha ?? undefined,
      };

      let result;
      try {
        result = await call(`/contents/${contentPath}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } catch (error) {
        // 409: the file moved on since we loaded it — someone edited from
        // another device, or a local `npm run studio` pushed. Refuse rather
        // than clobber, and say what to do about it.
        if (/sha|conflict|409/i.test(error.message)) {
          throw new Error(
            'This file changed on GitHub since you opened it. Reload the Studio to pick up the newer version before saving.',
          );
        }
        throw error;
      }

      contentSha = result.content.sha;
      return { commit: result.commit.sha, ok: true };
    },

    async listAssets() {
      const read = async (dir) => {
        try {
          const entries = await call(`/contents/${dir}?ref=${encodeURIComponent(branch)}`);
          return Array.isArray(entries) ? entries : [];
        } catch {
          return [];
        }
      };

      const [root, logos] = await Promise.all([read(assetsPath), read(`${assetsPath}/logos`)]);
      const out = [];

      for (const [entries, prefix] of [
        [root, ''],
        [logos, 'logos/'],
      ]) {
        for (const entry of entries) {
          if (entry.type !== 'file') continue;
          const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
          if (!/\.(png|jpe?g|webp|avif|gif|svg|pdf)$/i.test(ext)) continue;
          const ref = `${prefix}${entry.name}`;
          if (entry.download_url) downloadUrls.set(ref, entry.download_url);
          out.push({ ref, size: entry.size, kind: ext === '.pdf' ? 'doc' : 'image' });
        }
      }
      return out.sort((a, b) => a.ref.localeCompare(b.ref));
    },

    async uploadAsset(file, dir) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^[-.]+/, '');
      const ref = dir ? `${dir}/${safe}` : safe;
      const path = `${assetsPath}/${ref}`;

      // An existing file needs its sha, or GitHub treats the write as a
      // create and rejects it.
      let sha;
      try {
        const existing = await call(`/contents/${path}?ref=${encodeURIComponent(branch)}`);
        sha = existing.sha;
      } catch {
        sha = undefined;
      }

      const result = await call(`/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `content: add asset ${ref}`,
          content: bytesToBase64(await file.arrayBuffer()),
          branch,
          sha,
        }),
      });
      if (result.content.download_url) downloadUrls.set(ref, result.content.download_url);
      return ref;
    },

    /**
     * Thumbnails. A public repo hands back a raw.githubusercontent URL that
     * needs no auth; a private one does not, so fall back to pulling the bytes
     * through the API and handing back a blob URL.
     */
    async assetUrl(ref) {
      if (downloadUrls.has(ref)) return downloadUrls.get(ref);
      try {
        const res = await fetch(
          `${base}/contents/${assetsPath}/${ref}?ref=${encodeURIComponent(branch)}`,
          {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw' },
          },
        );
        if (!res.ok) return '';
        const url = URL.createObjectURL(await res.blob());
        downloadUrls.set(ref, url);
        return url;
      } catch {
        return '';
      }
    },

    /**
     * Publishing is the commit — the push starts the deploy workflow. So this
     * watches that workflow rather than doing any work itself.
     */
    publish(handlers) {
      let stopped = false;
      const started = Date.now();

      handlers.onStep({ label: 'Committed to GitHub', index: 1, total: 3 });
      handlers.onLog(`Watching ${owner}/${repo} for the deploy workflow…\n`);

      const poll = async () => {
        if (stopped) return;
        try {
          const data = await call(
            `/actions/runs?branch=${encodeURIComponent(branch)}&per_page=1&t=${Date.now()}`,
          );
          const run = data.workflow_runs?.[0];

          if (!run || new Date(run.created_at).getTime() < started - 120000) {
            handlers.onLog('.');
          } else if (run.status === 'completed') {
            if (run.conclusion === 'success') {
              handlers.onStep({ label: 'Deployed', index: 3, total: 3 });
              handlers.onLog(`\nWorkflow "${run.name}" succeeded.\n${run.html_url}\n`);
              handlers.onDone();
            } else {
              handlers.onError(
                `The deploy workflow finished as "${run.conclusion}". Open it on GitHub: ${run.html_url}`,
              );
            }
            return;
          } else {
            handlers.onStep({ label: `Building — ${run.status}`, index: 2, total: 3 });
            handlers.onLog('.');
          }
        } catch (error) {
          handlers.onLog(`\n(could not read workflow status: ${error.message})\n`);
        }
        setTimeout(poll, 5000);
      };

      setTimeout(poll, 4000);
      return () => {
        stopped = true;
      };
    },
  };
}
