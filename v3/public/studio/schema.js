/**
 * The shape of content.json, as the editor understands it.
 *
 * This is the single description of every editable field. Both the local
 * Studio (`npm run studio`) and the hosted one at /studio render from it, so a
 * new field added here appears in both without further work.
 */

export const SECTIONS = [
  {
    key: 'identity',
    label: 'About you',
    kind: 'object',
    blurb: 'Your name, what you do, and the words at the top of the page.',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'role', label: 'Role', type: 'text' },
      {
        key: 'focus',
        label: 'Focus',
        type: 'text',
        hint: 'Shown on the laptop screen. Dots read well as separators: Mobile · Backend · Cloud',
      },
      { key: 'location', label: 'Location', type: 'text' },
      {
        key: 'email',
        label: 'Email',
        type: 'email',
        hint: 'Changing this also updates your Email link under Links.',
      },
      {
        key: 'headline',
        label: 'Hero headline',
        type: 'lines',
        hint: 'One line per row — these are the big words in the hero. Three short lines works best.',
      },
      {
        key: 'bio',
        label: 'Bio',
        type: 'textarea',
        hint: 'One or two sentences. Used in the hero and in your search-result description.',
      },
      {
        key: 'portrait',
        label: 'Portrait',
        type: 'asset',
        hint: 'Shown in About and on the laptop screen, cropped to 4:5. A head-and-shoulders shot reads far better than a full-body one.',
      },
      { key: 'resume', label: 'Résumé (PDF)', type: 'asset', accept: 'doc' },
      { key: 'accent', label: 'Accent colour', type: 'color' },
    ],
  },
  {
    key: 'projects',
    label: 'Projects',
    kind: 'list',
    blurb:
      'The work section, and the pages behind each “View”. Drag to reorder — the first one is what the laptop shows first.',
    title: (p) => p.title || 'Untitled project',
    sub: (p) => p.year || '',
    create: () => ({
      id: `project-${Date.now().toString(36)}`,
      title: 'New project',
      category: '',
      year: String(new Date().getFullYear()),
      platform: '',
      accent: '#4f5bff',
      tech: [],
      description: '',
      image: '',
      gallery: [],
      demo: '',
      link: '',
      role: '',
      overview: '',
      highlights: [],
      recognition: [],
    }),
    fields: [
      {
        row: [
          { key: 'title', label: 'Title', type: 'text' },
          {
            key: 'id',
            label: 'ID',
            type: 'text',
            hint: 'Lowercase, dashes only. Used internally — changing it is fine.',
          },
        ],
      },
      {
        row: [
          { key: 'category', label: 'Category', type: 'text' },
          { key: 'year', label: 'Year', type: 'text' },
          { key: 'platform', label: 'Platform', type: 'text' },
        ],
      },
      { key: 'accent', label: 'Accent colour', type: 'color' },
      {
        key: 'description',
        label: 'Short description',
        type: 'textarea',
        hint: 'One line. This is what shows in the work list.',
      },
      { key: 'tech', label: 'Tech', type: 'chips' },
      { key: 'image', label: 'Cover image', type: 'asset' },
      {
        key: 'gallery',
        label: 'Extra screenshots',
        type: 'assets',
        hint: 'Optional. Leave empty and the detail page just uses the cover.',
      },
      {
        row: [
          {
            key: 'demo',
            label: 'Demo video URL',
            type: 'url',
            hint: 'An embeddable player link (Vimeo/YouTube embed).',
          },
          { key: 'link', label: 'Live / store link', type: 'url' },
        ],
      },
      { key: 'role', label: 'Your role', type: 'text' },
      {
        key: 'overview',
        label: 'Overview',
        type: 'textarea',
        rows: 6,
        hint: 'The long paragraph on the project page.',
      },
      { key: 'highlights', label: 'Highlights', type: 'bullets' },
      {
        key: 'recognition',
        label: 'Recognition',
        type: 'bullets',
        hint: 'Awards or standout results. Leave empty to hide.',
      },
    ],
  },
  {
    key: 'skillGroups',
    label: 'Stack',
    kind: 'list',
    blurb: 'Your tools, in groups. Each item can carry a logo from src/assets/logos.',
    title: (g) => g.label || 'Untitled group',
    sub: (g) => `${g.items?.length ?? 0} items`,
    create: () => ({ label: 'New group', items: [] }),
    fields: [
      { key: 'label', label: 'Group name', type: 'text' },
      {
        key: 'items',
        label: 'Items',
        type: 'sublist',
        create: () => ({ name: '', logo: '' }),
        columns: [
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'logo', label: 'Logo', type: 'asset', dir: 'logos' },
          { key: 'mono', label: 'Invert in dark', type: 'bool' },
        ],
      },
    ],
  },
  {
    key: 'achievements',
    label: 'Wins',
    kind: 'list',
    blurb: 'The numbers you want people to remember.',
    title: (a) => a.title || 'Untitled',
    sub: (a) => a.stat || '',
    create: () => ({
      id: `win-${Date.now().toString(36)}`,
      title: 'New achievement',
      category: '',
      stat: '',
      statLabel: '',
      description: '',
      color: '#4f5bff',
    }),
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        row: [
          { key: 'category', label: 'Category', type: 'text' },
          { key: 'stat', label: 'Stat', type: 'text', hint: 'The big figure: 100%, Top 5, < 50ms' },
          { key: 'statLabel', label: 'Stat label', type: 'text' },
        ],
      },
      { key: 'color', label: 'Colour', type: 'color' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    key: 'certifications',
    label: 'Certifications',
    kind: 'list',
    blurb: 'Credentials, with a link out to the issuer where you have one.',
    title: (c) => c.title || 'Untitled',
    sub: (c) => c.issuer || '',
    create: () => ({
      id: `cert-${Date.now().toString(36)}`,
      title: 'New certification',
      issuer: '',
      date: String(new Date().getFullYear()),
      badge: 'Certified',
      color: '#4f5bff',
      logo: '',
      skills: [],
      credentialUrl: '',
    }),
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        row: [
          { key: 'issuer', label: 'Issuer', type: 'text' },
          { key: 'date', label: 'Year', type: 'text' },
          { key: 'badge', label: 'Badge text', type: 'text' },
        ],
      },
      {
        row: [
          { key: 'color', label: 'Colour', type: 'color' },
          { key: 'logo', label: 'Logo', type: 'asset', dir: 'logos' },
        ],
      },
      { key: 'skills', label: 'Skills', type: 'chips' },
      { key: 'credentialUrl', label: 'Credential URL', type: 'url' },
    ],
  },
  {
    key: 'socials',
    label: 'Links',
    kind: 'list',
    blurb: 'Where people go next.',
    title: (s) => s.label || 'Untitled link',
    sub: (s) => s.handle || '',
    create: () => ({ label: '', handle: '', href: '' }),
    fields: [
      {
        row: [
          { key: 'label', label: 'Label', type: 'text' },
          { key: 'handle', label: 'Handle shown', type: 'text' },
        ],
      },
      { key: 'href', label: 'URL', type: 'url' },
    ],
  },
  {
    key: 'seo',
    label: 'Search & AI',
    kind: 'object',
    blurb:
      'What Google, ChatGPT and other crawlers read. These fill the page title, the description in search results, the link preview card, and the structured data.',
    fields: [
      {
        key: 'siteUrl',
        label: 'Site URL',
        type: 'url',
        hint: 'No trailing slash. Used for canonical links and the sitemap — this must be your real live address.',
      },
      {
        key: 'title',
        label: 'Page title',
        type: 'text',
        hint: 'Around 60 characters. Shows as the headline in search results.',
      },
      { key: 'tagline', label: 'Tagline', type: 'text' },
      {
        key: 'description',
        label: 'Search description',
        type: 'textarea',
        hint: 'Aim for 150–160 characters. This is the grey text under your title in Google.',
        counter: 160,
      },
      {
        key: 'keywords',
        label: 'Keywords',
        type: 'chips',
        hint: 'Minor for ranking, but they feed the structured data.',
      },
      {
        key: 'ogImage',
        label: 'Share image',
        type: 'asset',
        hint: 'The picture shown when your link is pasted into a chat. 1200×630 is ideal.',
      },
      {
        row: [
          { key: 'twitter', label: 'X / Twitter handle', type: 'text', hint: 'With the @.' },
          { key: 'locale', label: 'Locale', type: 'text' },
        ],
      },
    ],
  },
];
