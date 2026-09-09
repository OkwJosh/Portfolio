/**
 * The editor's rendering layer — shared by the local Studio and the hosted one.
 *
 * Knows nothing about where content comes from or goes. `configure()` injects
 * the three things it cannot decide for itself: the live document, what to do
 * when it changes, and how to open an asset picker.
 *
 * The rule that shapes this file: typing must never re-render. Inputs write
 * straight into the content object at their own key and stop there — a
 * re-render per keystroke would destroy focus and caret position. Only
 * structural edits (add, delete, reorder) redraw a section.
 */
import { SECTIONS } from './schema.js';

let ctx = {
  /** @type {object} the live content document, mutated in place */
  content: null,
  /** called after any edit, so the host can update its dirty indicator */
  onChange: () => {},
  /** @type {(opts: {dir?: string, accept?: string}) => Promise<string|null>} */
  pickAsset: async () => null,
  /** @type {(ref: string) => string} thumbnail URL for an asset reference */
  assetUrl: () => '',
};

export function configure(next) {
  ctx = { ...ctx, ...next };
}

export const $ = (sel) => document.querySelector(sel);

/** Which cards are expanded, keyed by the item object itself, so reordering
    carries the open state with the card rather than leaving it on an index. */
const open = new WeakSet();

// ── DOM ────────────────────────────────────────────────────────────────────

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'html') el.innerHTML = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function toast(message, kind = 'ok') {
  const el = h('div', { class: 'toast', dataset: { kind } }, message);
  $('#toasts').append(el);
  setTimeout(
    () => {
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(() => el.remove(), 320);
    },
    kind === 'error' ? 6000 : 2600,
  );
}

const changed = () => ctx.onChange();

const swap = (list, a, b) => {
  [list[a], list[b]] = [list[b], list[a]];
};

// ── Fields ─────────────────────────────────────────────────────────────────

export const build = {
  text: (obj, f) => textish('input', obj, f, 'text'),
  url: (obj, f) => textish('input', obj, f, 'url'),
  email: (obj, f) => textish('input', obj, f, 'email'),
  textarea: (obj, f) => textish('textarea', obj, f),

  color(obj, f) {
    const swatch = h('input', { type: 'color', value: obj[f.key] || '#000000' });
    const hex = h('input', { type: 'text', value: obj[f.key] ?? '', spellcheck: 'false' });
    swatch.addEventListener('input', () => {
      obj[f.key] = swatch.value;
      hex.value = swatch.value;
      changed();
    });
    hex.addEventListener('input', () => {
      obj[f.key] = hex.value;
      if (/^#[0-9a-f]{6}$/i.test(hex.value)) swatch.value = hex.value;
      changed();
    });
    return wrap(f, h('div', { class: 'color-field' }, swatch, hex));
  },

  bool(obj, f) {
    const box = h('input', { type: 'checkbox' });
    box.checked = Boolean(obj[f.key]);
    box.addEventListener('change', () => {
      obj[f.key] = box.checked;
      changed();
    });
    return h('label', { class: 'switch' }, box, f.label);
  },

  chips(obj, f) {
    const list = Array.isArray(obj[f.key]) ? obj[f.key] : (obj[f.key] = []);
    const box = h('div', { class: 'chips' });
    const entry = h('input', {
      type: 'text',
      placeholder: list.length ? 'Add…' : 'Type and press Enter',
      'aria-label': f.label,
    });

    const paint = () => {
      box.textContent = '';
      list.forEach((value, i) => {
        box.append(
          h(
            'span',
            { class: 'chip-tag' },
            value,
            h(
              'button',
              {
                type: 'button',
                'aria-label': `Remove ${value}`,
                onClick: () => {
                  list.splice(i, 1);
                  paint();
                  changed();
                },
              },
              '✕',
            ),
          ),
        );
      });
      box.append(entry);
    };

    const commit = () => {
      const value = entry.value.trim().replace(/,$/, '');
      if (!value) return;
      list.push(value);
      entry.value = '';
      paint();
      entry.focus();
      changed();
    };

    entry.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        commit();
      } else if (event.key === 'Backspace' && !entry.value && list.length) {
        list.pop();
        paint();
        entry.focus();
        changed();
      }
    });
    entry.addEventListener('blur', commit);

    paint();
    return wrap(f, box);
  },

  lines: (obj, f) => repeating(obj, f, 'input'),
  bullets: (obj, f) => repeating(obj, f, 'textarea'),

  asset(obj, f) {
    const node = h('div', { class: 'asset-field' });
    const paint = () => {
      const ref = obj[f.key];
      node.textContent = '';
      const isImage = ref && !/\.pdf$/i.test(ref);
      const thumb = h('div', { class: 'asset-thumb' }, !ref ? '—' : isImage ? '' : 'PDF');
      if (isImage) {
        // Resolving a thumbnail can be async (the hosted editor fetches it
        // through the API), so the box is painted first and filled when it
        // arrives rather than blocking the field on a network round trip.
        Promise.resolve(ctx.assetUrl(ref)).then((url) => {
          if (url) thumb.style.backgroundImage = `url(${url})`;
        });
      }
      node.append(
        thumb,
        h(
          'div',
          { class: 'asset-meta' },
          h('div', { class: `asset-ref${ref ? '' : ' empty'}` }, ref || 'Nothing chosen'),
        ),
        h(
          'div',
          { class: 'asset-actions' },
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-quiet',
              onClick: async () => {
                const picked = await ctx.pickAsset({ dir: f.dir, accept: f.accept });
                if (picked != null) {
                  obj[f.key] = picked;
                  paint();
                  changed();
                }
              },
            },
            ref ? 'Replace' : 'Choose',
          ),
          ref &&
            h(
              'button',
              {
                type: 'button',
                class: 'icon-btn danger',
                'aria-label': 'Clear',
                onClick: () => {
                  obj[f.key] = '';
                  paint();
                  changed();
                },
              },
              '✕',
            ),
        ),
      );
    };
    paint();
    return wrap(f, node);
  },

  assets(obj, f) {
    const list = Array.isArray(obj[f.key]) ? obj[f.key] : (obj[f.key] = []);
    const box = h('div', { class: 'lines' });
    const paint = () => {
      box.textContent = '';
      list.forEach((ref, i) => {
        const thumb = h('div', { class: 'asset-thumb' });
        Promise.resolve(ctx.assetUrl(ref)).then((url) => {
          if (url) thumb.style.backgroundImage = `url(${url})`;
        });
        box.append(
          h(
            'div',
            { class: 'line-row' },
            thumb,
            h('input', { type: 'text', value: ref, readonly: true }),
            h(
              'button',
              {
                type: 'button',
                class: 'icon-btn danger',
                'aria-label': 'Remove',
                onClick: () => {
                  list.splice(i, 1);
                  paint();
                  changed();
                },
              },
              '✕',
            ),
          ),
        );
      });
      box.append(
        h(
          'button',
          {
            type: 'button',
            class: 'add-btn',
            onClick: async () => {
              const picked = await ctx.pickAsset({});
              if (picked) {
                list.push(picked);
                paint();
                changed();
              }
            },
          },
          '+ Add image',
        ),
      );
    };
    paint();
    return wrap(f, box);
  },

  sublist(obj, f) {
    const list = Array.isArray(obj[f.key]) ? obj[f.key] : (obj[f.key] = []);
    const box = h('div', { class: 'sublist' });

    const paint = () => {
      box.textContent = '';
      list.forEach((item, i) => {
        const row = h('div', { class: 'sub-row' });
        for (const col of f.columns) row.append(build[col.type](item, { ...col, bare: true }));
        row.append(
          h(
            'button',
            {
              type: 'button',
              class: 'icon-btn',
              'aria-label': 'Move up',
              disabled: i === 0,
              onClick: () => {
                swap(list, i, i - 1);
                paint();
                changed();
              },
            },
            '↑',
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'icon-btn danger',
              'aria-label': 'Remove',
              onClick: () => {
                list.splice(i, 1);
                paint();
                changed();
              },
            },
            '✕',
          ),
        );
        box.append(row);
      });
      box.append(
        h(
          'button',
          {
            type: 'button',
            class: 'add-btn',
            onClick: () => {
              list.push(f.create());
              paint();
              changed();
            },
          },
          '+ Add item',
        ),
      );
    };

    paint();
    return wrap(f, box);
  },
};

function textish(tag, obj, f, inputType) {
  const el = h(tag, {
    ...(tag === 'input' ? { type: inputType ?? 'text' } : { rows: f.rows ?? 4 }),
    'aria-label': f.label,
    spellcheck: tag === 'textarea' ? 'true' : 'false',
  });
  el.value = obj[f.key] ?? '';

  let counter = null;
  if (f.counter) {
    counter = h('p', { class: 'field-hint' });
    const tick = () => {
      const n = (obj[f.key] ?? '').length;
      counter.textContent = `${n} characters${
        n > f.counter ? ` — over ${f.counter}, Google will trim it` : ''
      }`;
      counter.style.color = n > f.counter ? 'var(--warn)' : '';
    };
    el.addEventListener('input', tick);
    tick();
  }

  el.addEventListener('input', () => {
    obj[f.key] = el.value;
    if (f.onInput) f.onInput(el.value, ctx.content);
    changed();
  });

  return wrap(f, el, counter);
}

/** Repeating single-value rows: the hero headline, project highlights. */
function repeating(obj, f, tag) {
  const list = Array.isArray(obj[f.key]) ? obj[f.key] : (obj[f.key] = []);
  const box = h('div', { class: 'lines' });

  const paint = () => {
    box.textContent = '';
    list.forEach((value, i) => {
      const input = h(tag, tag === 'input' ? { type: 'text' } : { rows: 2 });
      input.value = value;
      input.addEventListener('input', () => {
        list[i] = input.value;
        changed();
      });
      box.append(
        h(
          'div',
          { class: 'line-row' },
          input,
          h(
            'button',
            {
              type: 'button',
              class: 'icon-btn',
              'aria-label': 'Move up',
              disabled: i === 0,
              onClick: () => {
                swap(list, i, i - 1);
                paint();
                changed();
              },
            },
            '↑',
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'icon-btn',
              'aria-label': 'Move down',
              disabled: i === list.length - 1,
              onClick: () => {
                swap(list, i, i + 1);
                paint();
                changed();
              },
            },
            '↓',
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'icon-btn danger',
              'aria-label': 'Remove',
              onClick: () => {
                list.splice(i, 1);
                paint();
                changed();
              },
            },
            '✕',
          ),
        ),
      );
    });
    box.append(
      h(
        'button',
        {
          type: 'button',
          class: 'add-btn',
          onClick: () => {
            list.push('');
            paint();
            changed();
            box.querySelectorAll(tag)[list.length - 1]?.focus();
          },
        },
        '+ Add line',
      ),
    );
  };

  paint();
  return wrap(f, box);
}

function wrap(f, control, extra) {
  if (f.bare) return control;
  return h(
    'div',
    { class: 'field' },
    h('span', { class: 'field-label' }, f.label),
    control,
    f.hint && h('p', { class: 'field-hint' }, f.hint),
    extra,
  );
}

function renderFields(obj, fields) {
  return fields.map((f) =>
    f.row
      ? h('div', { class: 'row' }, f.row.map((sub) => build[sub.type](obj, sub)))
      : build[f.type](obj, f),
  );
}

// ── Sections ───────────────────────────────────────────────────────────────

export function renderSection(sectionKey) {
  const spec = SECTIONS.find((s) => s.key === sectionKey);
  const editor = $('#editor');
  editor.textContent = '';
  editor.scrollTop = 0;

  editor.append(
    h('div', { class: 'section-head' }, h('h1', {}, spec.label), spec.blurb && h('p', {}, spec.blurb)),
  );

  if (spec.kind === 'object') {
    editor.append(
      h(
        'div',
        { class: 'card is-open' },
        h('div', { class: 'card-body' }, renderFields(ctx.content[spec.key], spec.fields)),
      ),
    );
    return;
  }

  const list = ctx.content[spec.key];
  const redraw = () => renderSection(sectionKey);

  if (!list.length) editor.append(h('p', { class: 'empty-note' }, 'Nothing here yet.'));

  list.forEach((item, index) => {
    const card = h('div', { class: `card${open.has(item) ? ' is-open' : ''}`, draggable: 'false' });

    const head = h(
      'div',
      { class: 'card-head' },
      h('span', { class: 'drag-handle', title: 'Drag to reorder' }, '⠿'),
      h('span', { class: 'card-title' }, spec.title(item)),
      spec.sub?.(item) && h('span', { class: 'card-sub' }, spec.sub(item)),
      h(
        'span',
        { class: 'card-tools' },
        h(
          'button',
          {
            type: 'button',
            class: 'icon-btn',
            'aria-label': 'Move up',
            disabled: index === 0,
            onClick: (e) => {
              e.stopPropagation();
              swap(list, index, index - 1);
              redraw();
              changed();
            },
          },
          '↑',
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'icon-btn',
            'aria-label': 'Move down',
            disabled: index === list.length - 1,
            onClick: (e) => {
              e.stopPropagation();
              swap(list, index, index + 1);
              redraw();
              changed();
            },
          },
          '↓',
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'icon-btn',
            'aria-label': 'Duplicate',
            onClick: (e) => {
              e.stopPropagation();
              const copy = structuredClone(item);
              if (copy.id) copy.id = `${copy.id}-copy`;
              if (copy.title) copy.title = `${copy.title} copy`;
              list.splice(index + 1, 0, copy);
              open.add(copy);
              redraw();
              changed();
            },
          },
          '⧉',
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'icon-btn danger',
            'aria-label': 'Delete',
            onClick: (e) => {
              e.stopPropagation();
              if (!confirm(`Delete “${spec.title(item)}”? This cannot be undone from here.`)) return;
              list.splice(index, 1);
              redraw();
              changed();
            },
          },
          '✕',
        ),
      ),
    );

    head.addEventListener('click', () => {
      const isOpen = card.classList.toggle('is-open');
      if (isOpen) open.add(item);
      else open.delete(item);
      if (isOpen && !card.querySelector('.card-body')) {
        card.append(h('div', { class: 'card-body' }, renderFields(item, spec.fields)));
      }
    });

    // Drag-to-reorder, armed from the handle only, so selecting text inside a
    // field can never start a drag.
    head.querySelector('.drag-handle').addEventListener('mousedown', () =>
      card.setAttribute('draggable', 'true'),
    );
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
      card.classList.add('is-dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      card.setAttribute('draggable', 'false');
    });
    card.addEventListener('dragover', (event) => {
      event.preventDefault();
      card.classList.add('drop-target');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
    card.addEventListener('drop', (event) => {
      event.preventDefault();
      card.classList.remove('drop-target');
      const from = Number(event.dataTransfer.getData('text/plain'));
      if (Number.isNaN(from) || from === index) return;
      const [moved] = list.splice(from, 1);
      list.splice(index, 0, moved);
      redraw();
      changed();
    });

    card.append(head);
    if (open.has(item)) card.append(h('div', { class: 'card-body' }, renderFields(item, spec.fields)));
    editor.append(card);
  });

  editor.append(
    h(
      'button',
      {
        type: 'button',
        class: 'add-btn',
        onClick: () => {
          const item = spec.create();
          list.push(item);
          open.add(item);
          redraw();
          changed();
          $('#editor').scrollTo({ top: $('#editor').scrollHeight, behavior: 'smooth' });
        },
      },
      `+ Add ${spec.label.replace(/s$/, '').toLowerCase()}`,
    ),
  );
}

export function renderRail(current, onSelect) {
  const rail = $('#rail');
  rail.textContent = '';
  for (const spec of SECTIONS) {
    const count = spec.kind === 'list' ? ctx.content[spec.key]?.length : null;
    rail.append(
      h(
        'button',
        {
          type: 'button',
          class: 'rail-item',
          'aria-current': String(spec.key === current),
          onClick: () => onSelect(spec.key),
        },
        h('span', {}, spec.label),
        count != null && h('span', { class: 'rail-count' }, count),
      ),
    );
  }
}
