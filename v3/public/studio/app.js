/**
 * Content Studio — the shell.
 *
 * One editor, two homes. Run locally (`npm run studio`) it talks to a Node
 * server and writes content.json straight to disk; served from /studio on the
 * live site it talks to GitHub and commits, which triggers the rebuild. Which
 * one is in play is detected, not configured — see pickBackend().
 */
import { SECTIONS } from './schema.js';
import { $, configure, h, renderRail, renderSection, toast } from './ui.js';
import { localBackend } from './backend-local.js';
import { DEFAULTS, clearCreds, createGitHubBackend, readCreds, writeCreds } from './backend-github.js';

const state = {
  backend: null,
  content: null,
  saved: '',
  section: SECTIONS[0].key,
  assets: [],
  saving: false,
};

const dirty = () => JSON.stringify(state.content) !== state.saved;

function markDirty() {
  if (state.saving) return;
  const badge = $('#save-state');
  const isDirty = dirty();
  badge.dataset.state = isDirty ? 'dirty' : 'clean';
  badge.textContent = isDirty ? 'Unsaved' : 'Saved';
}

// ── Which backend? ─────────────────────────────────────────────────────────

/**
 * The local server answers /api/content; the static host does not (it falls
 * through the SPA rewrite and returns the site's HTML). So: ask, and believe
 * the answer only if it is actually JSON.
 */
async function pickBackend() {
  try {
    const res = await fetch('/api/content', { headers: { accept: 'application/json' } });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      return localBackend;
    }
  } catch {
    /* not local */
  }
  return null;
}

// ── Sign-in (hosted mode) ──────────────────────────────────────────────────

function signIn() {
  const modal = $('#auth-modal');
  const saved = readCreds() ?? DEFAULTS;

  $('#auth-owner').value = saved.owner;
  $('#auth-repo-input').value = saved.repo;
  $('#auth-branch').value = saved.branch;
  $('#auth-repo').textContent = `${saved.owner}/${saved.repo}`;
  modal.showModal();

  return new Promise((resolve) => {
    const go = async () => {
      const creds = {
        token: $('#auth-token').value.trim(),
        owner: $('#auth-owner').value.trim() || DEFAULTS.owner,
        repo: $('#auth-repo-input').value.trim() || DEFAULTS.repo,
        branch: $('#auth-branch').value.trim() || DEFAULTS.branch,
      };
      const error = $('#auth-error');

      if (!creds.token) {
        error.hidden = false;
        error.textContent = 'Paste a token first.';
        return;
      }

      $('#auth-go').disabled = true;
      $('#auth-go').textContent = 'Checking…';
      try {
        const backend = createGitHubBackend(creds);
        await backend.verify();
        writeCreds(creds);
        modal.close();
        resolve(backend);
      } catch (problem) {
        error.hidden = false;
        error.textContent = problem.message;
        $('#auth-go').disabled = false;
        $('#auth-go').textContent = 'Connect';
      }
    };

    $('#auth-go').addEventListener('click', go);
    $('#auth-token').addEventListener('keydown', (e) => e.key === 'Enter' && go());
  });
}

// ── Asset picker ───────────────────────────────────────────────────────────

let resolvePick = null;

async function refreshAssets() {
  try {
    state.assets = await state.backend.listAssets();
  } catch (error) {
    toast(`Could not list images: ${error.message}`, 'error');
    state.assets = [];
  }
}

function pickAsset({ dir, accept }) {
  const modal = $('#asset-modal');
  $('#asset-modal-title').textContent = accept === 'doc' ? 'Choose a document' : 'Choose an image';
  modal.dataset.dir = dir ?? '';
  modal.dataset.accept = accept ?? 'image';
  paintAssetGrid();
  modal.showModal();
  return new Promise((resolve) => {
    resolvePick = resolve;
  });
}

function paintAssetGrid() {
  const modal = $('#asset-modal');
  const grid = $('#asset-grid');
  const accept = modal.dataset.accept;
  grid.textContent = '';

  const wanted = state.assets.filter((a) =>
    accept === 'doc' ? a.kind === 'doc' : a.kind === 'image',
  );
  if (!wanted.length) {
    grid.append(h('p', { class: 'empty-note' }, 'No files yet — drop one above.'));
    return;
  }

  for (const item of wanted) {
    const card = h(
      'button',
      {
        type: 'button',
        class: 'asset-card',
        onClick: () => {
          resolvePick?.(item.ref);
          resolvePick = null;
          modal.close();
        },
      },
      item.kind === 'image'
        ? h('img', { alt: '', loading: 'lazy' })
        : h('div', { class: 'doc' }, 'PDF'),
      h('span', {}, item.ref),
    );
    if (item.kind === 'image') {
      Promise.resolve(state.backend.assetUrl(item.ref)).then((url) => {
        const img = card.querySelector('img');
        if (img && url) img.src = url;
      });
    }
    grid.append(card);
  }
}

async function upload(file) {
  const modal = $('#asset-modal');
  const zone = $('#dropzone');
  zone.classList.add('over');
  try {
    const ref = await state.backend.uploadAsset(file, modal.dataset.dir || '');
    await refreshAssets();
    paintAssetGrid();
    toast(`Added ${ref}`);
    resolvePick?.(ref);
    resolvePick = null;
    modal.close();
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    zone.classList.remove('over');
  }
}

// ── Save / publish ─────────────────────────────────────────────────────────

async function save() {
  if (state.saving) return false;
  state.saving = true;
  const badge = $('#save-state');
  badge.dataset.state = 'saving';
  badge.textContent = 'Saving…';

  try {
    await state.backend.save(state.content);
    state.saved = JSON.stringify(state.content);
    state.saving = false;
    markDirty();
    if (state.backend.name === 'local') reloadPreview();
    return true;
  } catch (error) {
    state.saving = false;
    markDirty();
    toast(error.message, 'error');
    return false;
  }
}

function reloadPreview() {
  const frame = $('#preview-frame');
  const url = state.backend.preview;
  if (!url) return;
  const sep = url.includes('?') ? '&' : '?';
  frame.src = `${url}${sep}boot=0&t=${Date.now()}`;
  $('#preview-open').href = url;
}

let stopPublish = null;

function runPublish() {
  const log = $('#publish-log');
  const steps = $('#publish-steps');
  const go = $('#publish-go');
  log.textContent = '';
  steps.textContent = '';
  go.disabled = true;

  let current = null;
  stopPublish = state.backend.publish({
    onStep({ label, index, total }) {
      if (current) current.dataset.state = 'done';
      current = h('li', { dataset: { state: 'running' } }, `${label} (${index}/${total})`);
      steps.append(current);
    },
    onLog(text) {
      log.textContent += text;
      log.scrollTop = log.scrollHeight;
    },
    onDone() {
      if (current) current.dataset.state = 'done';
      log.textContent += '\n✓ Live.\n';
      log.scrollTop = log.scrollHeight;
      toast('Published — your site is live.');
      go.disabled = false;
    },
    onError(message) {
      if (current) current.dataset.state = 'failed';
      log.textContent += `\n✕ ${message}\n`;
      log.scrollTop = log.scrollHeight;
      toast(message, 'error');
      go.disabled = false;
    },
  });
}

// ── Boot ───────────────────────────────────────────────────────────────────

async function boot() {
  state.backend = await pickBackend();

  const hosted = !state.backend;
  if (hosted) {
    const creds = readCreds();
    if (creds?.token) {
      const backend = createGitHubBackend(creds);
      try {
        await backend.verify();
        state.backend = backend;
      } catch {
        state.backend = await signIn();
      }
    } else {
      state.backend = await signIn();
    }
    $('#btn-signout').hidden = false;
  }

  const { content } = await state.backend.load();
  state.content = content;
  state.saved = JSON.stringify(content);

  // Hosted has no dev server to show; the live site is the honest thing to
  // put there, clearly labelled as lagging behind unsaved edits.
  if (!state.backend.preview) {
    state.backend.preview = content.seo?.siteUrl || null;
    $('#preview-label').textContent = 'Live site';
  }

  configure({
    content: state.content,
    onChange: markDirty,
    pickAsset,
    assetUrl: (ref) => state.backend.assetUrl(ref),
  });

  await refreshAssets();

  $('#brand-sub').textContent = `${content.identity.name} · ${state.backend.label}`;
  $('#publish-intro').innerHTML =
    state.backend.name === 'local'
      ? `Builds the site and deploys it to Firebase Hosting at <strong>${content.seo.siteUrl}</strong>. Unsaved edits are saved first.`
      : `Your last save was committed to <strong>${state.backend.label}</strong>, which starts the deploy workflow. This watches it until the site is live.`;

  // Keep the Email link in step with the identity email — the same fact in two
  // places, and remembering the second one is exactly what this tool exists to
  // remove.
  SECTIONS[0].fields.find((f) => f.key === 'email').onInput = (value, doc) => {
    for (const social of doc.socials) {
      if (social.href?.startsWith('mailto:')) {
        social.href = `mailto:${value}`;
        social.handle = value;
      }
    }
  };

  const show = (key) => {
    state.section = key;
    renderRail(key, show);
    renderSection(key);
  };
  show(state.section);
  markDirty();
  reloadPreview();

  // ── wiring ──
  $('#btn-save').addEventListener('click', async () => {
    if (await save()) {
      toast(
        state.backend.name === 'local' ? 'Saved to content.json' : 'Committed — the site is rebuilding',
      );
      if (state.backend.name === 'github') {
        $('#publish-modal').showModal();
        runPublish();
      }
    }
  });

  $('#btn-revert').addEventListener('click', () => {
    if (!dirty()) return toast('Nothing to revert');
    if (!confirm('Discard all unsaved changes?')) return;
    state.content = JSON.parse(state.saved);
    configure({ content: state.content });
    show(state.section);
    markDirty();
  });

  $('#btn-signout').addEventListener('click', () => {
    if (dirty() && !confirm('You have unsaved changes. Sign out anyway?')) return;
    clearCreds();
    location.reload();
  });

  $('#toggle-preview').addEventListener('click', () => {
    const root = document.documentElement;
    root.dataset.preview = root.dataset.preview === 'on' ? 'off' : 'on';
  });

  $('#preview-reload').addEventListener('click', reloadPreview);

  for (const button of document.querySelectorAll('[data-viewport]')) {
    button.addEventListener('click', () => {
      for (const other of document.querySelectorAll('[data-viewport]')) {
        other.setAttribute('aria-pressed', String(other === button));
      }
      $('#preview-stage').dataset.viewport = button.dataset.viewport;
    });
  }

  $('#btn-publish').addEventListener('click', async () => {
    if (dirty() && !(await save())) return;
    $('#publish-modal').showModal();
    if (state.backend.name === 'github') runPublish();
  });
  $('#publish-go').addEventListener('click', runPublish);
  $('#publish-close').addEventListener('click', () => {
    stopPublish?.();
    $('#publish-modal').close();
  });

  const modal = $('#asset-modal');
  modal.addEventListener('close', () => {
    resolvePick?.(null);
    resolvePick = null;
  });

  const zone = $('#dropzone');
  for (const type of ['dragenter', 'dragover']) {
    zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.add('over');
    });
  }
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('over');
    const file = event.dataTransfer.files?.[0];
    if (file) upload(file);
  });
  $('#file-input').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) upload(file);
    event.target.value = '';
  });

  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      $('#btn-save').click();
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (!dirty()) return;
    event.preventDefault();
    event.returnValue = '';
  });
}

boot().catch((error) => {
  document.body.innerHTML = `<pre style="padding:2rem;color:#f87171;font:14px monospace;white-space:pre-wrap">Studio failed to start:\n\n${error.message}</pre>`;
});
