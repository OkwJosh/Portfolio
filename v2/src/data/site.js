/**
 * Single source of truth for page content.
 *
 * The work list, marquee and meta blocks in `index.html` are rendered from
 * here at runtime, so adding a project is a one-object change.
 *
 * Vite resolves these `new URL(..., import.meta.url)` asset references at build
 * time and rewrites them to hashed dist paths.
 */

const asset = (file) => new URL(`../assets/${file}`, import.meta.url).href;
const logo = (file) => new URL(`../assets/logos/${file}`, import.meta.url).href;

export const identity = {
  name: 'Okwoli Joshua',
  short: 'Okwoli',
  role: 'Software Engineer',
  discipline: 'Mobile · Backend · Cloud',
  location: 'Nigeria — WAT',
  year: '26',
  /** House accent — what the scene returns to when nothing is hovered. */
  accent: '#4f5bff',
  email: 'okwjosh123@gmail.com',
  resume: asset('Okwoli_Joshua.pdf'),
  portrait: asset('pfp.jpg'),
};

/**
 * Editorial copy (hero, about) lives directly in `index.html` — it is prose and
 * belongs in the markup for SEO and no-JS readability. Only the *repeating*
 * collections below are rendered by JS.
 */
export const projects = [
  {
    id: 'nurahelp',
    title: 'NuraHelp',
    category: 'Healthcare · AI',
    year: '2025',
    platform: 'iOS · Android',
    accent: '#34d399', // mint
    tech: ['Flutter', 'Firebase', 'REST APIs'],
    description:
      'Cross-platform appointment scheduling with AI chat, real-time availability and secure patient records.',
    /** Engineering detail — shown in the demo panel. */
    highlights: [
      'Firestore listeners for live slot availability',
      'Streamed LLM chat responses over REST',
      'Role-based access rules for patient data',
    ],
    image: asset('nurahelp.png'),
    demo: 'https://player.vimeo.com/video/1165404715',
  },
  {
    id: 'progear',
    title: 'ProGear',
    category: 'E-Commerce',
    year: '2025',
    platform: 'iOS · Android',
    accent: '#7c3aed', // violet
    tech: ['Flutter', 'Dart', 'Firebase', 'GetX'],
    description:
      'A full storefront for gaming gear — catalogue browsing, secure checkout and live order tracking.',
    highlights: [
      'GetX reactive state across cart and catalogue',
      'Payment flow with idempotent order writes',
      'Paginated product queries with image caching',
    ],
    image: asset('PG.jpg'),
    demo: 'https://player.vimeo.com/video/1165377998',
  },
  {
    id: 'payoff',
    title: 'PayOff',
    category: 'Fintech',
    year: '2024',
    platform: 'iOS · Android',
    accent: '#06b6d4', // cyan
    tech: ['Flutter', 'Firebase', 'GetX'],
    description:
      'Offline-first peer-to-peer payments with QR transfers, transaction history and secure auth.',
    highlights: [
      'Local write queue that reconciles on reconnect',
      'QR encode/decode for offline transfer handoff',
      'Auth with session persistence and re-auth guards',
    ],
    image: asset('payoff.png'),
    demo: 'https://player.vimeo.com/video/1165405120',
  },
  {
    id: 'brainstorm',
    title: 'BrainStorm',
    category: 'Productivity',
    year: '2024',
    platform: 'iOS · Android',
    accent: '#f472b6', // pink
    tech: ['Flutter', 'Dart', 'Canvas', 'Local Storage'],
    description:
      'A mindmapping tool for organising ideas as nodes and connections on an infinite canvas.',
    highlights: [
      'Custom painter for the infinite pannable canvas',
      'Hit-testing and node dragging without a physics lib',
      'Local persistence so graphs survive cold starts',
    ],
    image: asset('brainstorm.png'),
    demo: 'https://player.vimeo.com/video/1165404664',
  },
];

/**
 * Skills, grouped the way an engineer would read them.
 *
 * `logo` is optional — entries without one render a small accent marker
 * instead. To give a skill its mark, drop the file in `src/assets/logos/` and
 * add `logo: logo('name.png')`.
 *
 * `invertOnDark` flags monochrome marks that would otherwise disappear on one
 * of the two themes.
 */
export const skillGroups = [
  {
    label: 'Languages',
    note: 'Where the work starts',
    items: [
      { name: 'Dart', logo: logo('dart.png') },
      { name: 'Python', logo: logo('python.png') },
      { name: 'JavaScript', logo: logo('javascript.png') },
    ],
  },
  {
    label: 'Mobile & Frontend',
    note: 'Cross-platform delivery',
    items: [
      { name: 'Flutter', logo: logo('flutter.png') },
      { name: 'GetX', logo: logo('getx.png') },
      { name: 'BLoC', logo: logo('bloc.png') },
    ],
  },
  {
    label: 'Backend & Data',
    note: 'APIs, auth, persistence',
    items: [
      { name: 'Node.js', logo: logo('node.png') },
      { name: 'Django', logo: logo('django.png') },
      { name: 'MongoDB', logo: logo('mongodb.png') },
      { name: 'REST APIs', logo: logo('rest_api.png') },
    ],
  },
  {
    label: 'Cloud & Tooling',
    note: 'Ship, host, iterate',
    items: [
      // No mark bundled for these two yet — see the note above.
      { name: 'Google Cloud' },
      { name: 'Firebase', logo: logo('firebase.png') },
      { name: 'CI/CD' },
      { name: 'Git', logo: logo('git.png') },
      { name: 'GitHub', logo: logo('github.png'), invertOnDark: true },
    ],
  },
];

/** Flat list for the marquee strip. */
export const stack = skillGroups.flatMap((group) => group.items.map((item) => item.name));

export const socials = [
  { label: 'GitHub', handle: '@OkwJosh', href: 'https://github.com/OkwJosh' },
  { label: 'LinkedIn', handle: 'in/joshokw', href: 'https://linkedin.com/in/joshokw' },
  {
    label: 'Upwork',
    handle: 'Hire me',
    href: 'https://www.upwork.com/freelancers/~01a1d8b4e20769fc75?mp_source=share',
  },
  { label: 'Email', handle: identity.email, href: `mailto:${identity.email}` },
];

export const nav = [
  { id: 'top', label: 'Home' },
  { id: 'work', label: 'Work' },
  { id: 'stack', label: 'Stack' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
];
