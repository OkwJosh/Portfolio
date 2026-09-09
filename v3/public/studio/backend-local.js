/**
 * Backend: the local Studio server (`npm run studio`).
 *
 * Content is a file on disk; saving writes it, publishing shells out to
 * `vite build` and `firebase deploy` and streams the log back over SSE.
 */
export const localBackend = {
  name: 'local',
  label: 'local files',
  /** A live Vite server sits alongside, so the editor can show the real site. */
  preview: null,

  async load() {
    const res = await fetch('/api/content');
    if (!res.ok) throw new Error('Could not read content.json');
    const data = await res.json();
    this.preview = `http://localhost:${data.previewPort}/`;
    return { content: data.content };
  },

  async save(content) {
    const res = await fetch('/api/content', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(content),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Save failed');
    return data;
  },

  async listAssets() {
    const res = await fetch('/api/assets');
    const { assets } = await res.json();
    return assets;
  },

  async uploadAsset(file, dir) {
    const res = await fetch(
      `/api/assets?name=${encodeURIComponent(file.name)}&dir=${encodeURIComponent(dir ?? '')}`,
      { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: file },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Upload failed');
    return data.ref;
  },

  assetUrl(ref) {
    return `/api/asset?ref=${encodeURIComponent(ref)}`;
  },

  /**
   * Build + deploy, reported step by step.
   * @param {{onStep, onLog, onDone, onError}} handlers
   */
  publish(handlers) {
    const source = new EventSource('/api/publish');
    source.addEventListener('step', (e) => handlers.onStep(JSON.parse(e.data)));
    source.addEventListener('log', (e) => handlers.onLog(JSON.parse(e.data).text));
    source.addEventListener('done', () => {
      handlers.onDone();
      source.close();
    });
    source.addEventListener('error', (e) => {
      handlers.onError(e.data ? JSON.parse(e.data).message : 'Connection to the studio dropped.');
      source.close();
    });
    return () => source.close();
  },
};
