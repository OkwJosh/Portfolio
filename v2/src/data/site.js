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

export const identity = {
  name: 'Okwoli Joshua',
  short: 'Okwoli',
  role: 'Flutter Developer',
  discipline: 'Mobile Engineer',
  location: 'Nigeria — WAT',
  year: '25',
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
    accent: '#34d399', // mint
    tech: ['Flutter', 'Firebase', 'REST APIs'],
    description:
      'A cross-platform appointment scheduling system with AI chat integration, real-time availability and secure patient records.',
    image: asset('nurahelp.png'),
    demo: 'https://player.vimeo.com/video/1165404715',
  },
  {
    id: 'progear',
    title: 'ProGear',
    category: 'E-Commerce',
    year: '2025',
    accent: '#7c3aed', // violet
    tech: ['Flutter', 'Dart', 'Firebase', 'GetX'],
    description:
      'A full e-commerce app for gaming gear — seamless browsing, secure payments and live order tracking.',
    image: asset('PG.jpg'),
    demo: 'https://player.vimeo.com/video/1165377998',
  },
  {
    id: 'payoff',
    title: 'PayOff',
    category: 'Fintech',
    year: '2024',
    accent: '#06b6d4', // cyan
    tech: ['Flutter', 'Firebase', 'GetX'],
    description:
      'An offline-first P2P payment app with QR code transfers, transaction history and secure auth.',
    image: asset('payoff.png'),
    demo: 'https://player.vimeo.com/video/1165405120',
  },
  {
    id: 'brainstorm',
    title: 'BrainStorm',
    category: 'Productivity',
    year: '2024',
    accent: '#f472b6', // pink
    tech: ['Flutter', 'Dart', 'Canvas', 'Local Storage'],
    description:
      'A mindmapping tool for organising ideas as nodes and connections on an infinite canvas.',
    image: asset('brainstorm.png'),
    demo: 'https://player.vimeo.com/video/1165404664',
  },
];

export const stack = [
  'Flutter', 'Dart', 'GetX', 'BLoC', 'Firebase', 'Python', 'Django',
  'Node.js', 'MongoDB', 'REST APIs', 'JavaScript', 'Git', 'CI/CD',
];

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
  { id: 'index', label: 'Index' },
  { id: 'work', label: 'Work' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
];
