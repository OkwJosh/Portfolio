import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useInView, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import {
  Github, Linkedin, Mail, Download, Menu, X, ArrowLeft,
  ChevronDown, Sun, Moon, Code, Play, ArrowUpRight, Smartphone, Server, Layers,
  Zap, Sparkles, Calendar, ArrowRight,
} from 'lucide-react';
import profileImg from '../assets/pfp.jpg';
import progearImg from '../assets/PG.jpg';
import payoffImg from '../assets/payoff.png';
import brainstormImg from '../assets/brainstorm.png';
import nurahelpImg from '../assets/nurahelp.png';
import blocIcon from '../assets/logos/bloc.png';
import dartIcon from '../assets/logos/dart.png';
import firebaseIcon from '../assets/logos/firebase.png';
import flutterIcon from '../assets/logos//flutter.png';
import getxIcon from '../assets/logos/getx.png';
import pythonIcon from '../assets/logos/python.png';
import javascriptIcon from '../assets/logos/javascript.png';
import nodeIcon from '../assets/logos/node.png';
import djangoIcon from '../assets/logos/django.png';
import gitIcon from '../assets/logos/git.png';
import restIcon from '../assets/logos/rest_api.png';
import githubIcon from '../assets/logos/github.png';
import mongoDb from '../assets/logos/mongodb.png';
import upworkLogo from '../assets/logos/upwork.svg';
import resumePDF from '../assets/Okwoli_Joshua.pdf';

// ─── Animated Section Wrapper ───
function AnimatedSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Staggered Children Wrapper ───
function StaggerContainer({ children, className = '', staggerDelay = 0.1 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        visible: { transition: { staggerChildren: staggerDelay } },
        hidden: {},
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const staggerChild = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ─── Section Eyebrow ───
function Eyebrow({ children }) {
  return (
    <span className="eyebrow mb-4">
      <span className="eyebrow-line" />
      {children}
    </span>
  );
}

// ─── Generic Spotlight Card (cursor-follow glow) ───
function SpotlightCard({ accent = 'var(--accent)', className = '', innerClassName = '', children, ...rest }) {
  const ref = useRef(null);

  const handleMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  }, []);

  return (
    <div
      ref={ref}
      className={`spot-card ${className}`}
      style={{ '--spot-accent': accent }}
      onMouseMove={handleMove}
      {...rest}
    >
      <div className={`spot-card-inner ${innerClassName}`}>{children}</div>
    </div>
  );
}

// ─── Interactive Project Card (3D tilt + cursor spotlight) ───
function ProjectCard({ project, index, onOpen, featured = false }) {
  const cardRef = useRef(null);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [6, -6]), { stiffness: 180, damping: 18 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-6, 6]), { stiffness: 180, damping: 18 });

  const handleMove = useCallback((e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    px.set(x);
    py.set(y);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
  }, [px, py]);

  const handleLeave = useCallback(() => {
    px.set(0.5);
    py.set(0.5);
  }, [px, py]);

  return (
    <motion.div variants={staggerChild} className="group h-full" style={{ perspective: 1000 }}>
      <motion.div
        ref={cardRef}
        className={`proj-card h-full ${featured ? 'featured' : ''}`}
        style={{ '--proj-accent': project.color, rotateX, rotateY }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <div className="proj-card-inner h-full">
          <span className="proj-index">{String(index + 1).padStart(2, '0')}</span>

          <div className={`proj-body h-full flex ${featured ? 'flex-col sm:flex-row sm:items-center gap-6' : 'flex-col'}`}>
            {/* icon tile */}
            <div className={`proj-tile ${featured ? 'proj-tile-lg' : ''} flex-shrink-0`}>
              <img src={project.image} alt={project.title} loading="lazy" />
            </div>

            <div className="flex-1 min-w-0 flex flex-col">
              <div className="proj-meta mb-2">
                <span className="dot" />
                {project.category}
              </div>
              <h3 className={`font-bold leading-tight ${featured ? 'text-2xl' : 'text-xl'}`} style={{ color: 'var(--text-primary)' }}>
                {project.title}
              </h3>

              <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--text-secondary)' }}>
                {project.description}
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                {project.tech.map((tech, i) => (
                  <span key={i} className="proj-badge px-3 py-1.5 rounded-lg text-xs font-medium">
                    {tech}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between mt-auto pt-5">
                <button onClick={() => onOpen(project)} className="proj-cta">
                  <span className="cta-play">
                    <Play size={11} fill="currentColor" />
                  </span>
                  Watch Demo
                </button>
                <ArrowUpRight
                  size={20}
                  className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                  style={{ color: 'var(--text-muted)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Intro Splash Screen ───
function IntroScreen({ onComplete }) {
  const [phase, setPhase] = useState('enter'); // enter -> reveal -> exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 1200);
    const t2 = setTimeout(() => setPhase('exit'), 2800);
    const t3 = setTimeout(() => onComplete(), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <motion.div
      className="intro-overlay"
      animate={phase === 'exit' ? { opacity: 0, scale: 1.5 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.div
        className="relative z-10 flex flex-col items-center gap-6"
        initial={{ scale: 0, rotate: -10 }}
        animate={
          phase === 'enter'
            ? { scale: 1, rotate: 0 }
            : phase === 'reveal'
              ? { scale: 0.85, rotate: 0, y: -20 }
              : { scale: 2, rotate: 0, opacity: 0 }
        }
        transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="relative">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-indigo-400/30 to-emerald-400/30 blur-md" />
          <motion.img
            src={profileImg}
            alt="Okwoli Joshua"
            className="w-40 h-40 md:w-52 md:h-52 rounded-full object-cover relative z-10 border-4 border-white/10"
            initial={{ filter: 'blur(10px)' }}
            animate={{ filter: 'blur(0px)' }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
        </div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={phase !== 'enter' ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold gradient-text-hero">Okwoli Joshua</h1>
          <motion.p
            className="text-gray-400 mt-2 text-sm"
            initial={{ opacity: 0 }}
            animate={phase === 'reveal' ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.3 }}
          >
            Flutter Developer
          </motion.p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function Portfolio() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [showIntro, setShowIntro] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const { scrollY, scrollYProgress } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const progressScaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  const handleIntroComplete = useCallback(() => setShowIntro(false), []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    document.body.style.overflow = showIntro ? 'hidden' : '';
  }, [showIntro]);

  useEffect(() => {
    const handleNavScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleNavScroll);
    return () => window.removeEventListener('scroll', handleNavScroll);
  }, []);

  useEffect(() => {
    if (selectedDemo) {
      window.scrollTo(0, 0);
      return;
    }

    const handleScroll = () => {
      const sections = ['home', 'about', 'skills', 'projects', 'achievements', 'contact'];
      const scrollPosition = window.scrollY + 150;
      const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50;

      if (isAtBottom) {
        setActiveSection('contact');
        return;
      }

      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i]);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedDemo]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const navItems = ['home', 'about', 'skills', 'projects', 'achievements', 'contact'];

  const projects = [
    {
      title: 'NuraHelp',
      category: 'Healthcare · AI',
      description: 'A cross-platform appointment scheduling system with AI chat integration, real-time availability, and secure patient records.',
      tech: ['Flutter', 'Firebase', 'REST APIs'],
      image: nurahelpImg,
      demo: 'https://player.vimeo.com/video/1165404715',
      color: '#34d399',
    },
    {
      title: 'ProGear',
      category: 'E-Commerce',
      description: 'A comprehensive e-commerce app for gaming gear with seamless browsing, secure payments, and order tracking.',
      tech: ['Flutter', 'Dart', 'Firebase', 'GetX'],
      image: progearImg,
      demo: 'https://player.vimeo.com/video/1165377998',
      color: '#7c3aed',
    },
    {
      title: 'PayOff',
      category: 'Fintech',
      description: 'An offline-first P2P payment app with QR code payments, transaction history, and secure auth.',
      tech: ['Flutter', 'Firebase', 'GetX'],
      image: payoffImg,
      demo: 'https://player.vimeo.com/video/1165405120',
      color: '#06b6d4',
    },
    {
      title: 'BrainStorm',
      category: 'Productivity',
      description: 'A mindmapping app to visually organize ideas with nodes and connections on an infinite canvas.',
      tech: ['Flutter', 'Dart', 'Flutter Canvas', 'Shared Preferences'],
      image: brainstormImg,
      demo: 'https://player.vimeo.com/video/1165404664',
      color: '#f472b6',
    },
  ];

  const skillGroups = [
    {
      label: 'Mobile & Cross-Platform',
      icon: Smartphone,
      accent: '#34d399',
      items: [
        { name: 'Flutter', logo: flutterIcon },
        { name: 'Dart', logo: dartIcon },
        { name: 'GetX', logo: getxIcon },
        { name: 'Bloc', logo: blocIcon },
      ],
    },
    {
      label: 'Backend & Data',
      icon: Server,
      accent: '#7c3aed',
      items: [
        { name: 'Python', logo: pythonIcon },
        { name: 'Django', logo: djangoIcon },
        { name: 'Node JS', logo: nodeIcon },
        { name: 'Firebase', logo: firebaseIcon },
        { name: 'MongoDB', logo: mongoDb },
        { name: 'REST APIs', logo: restIcon },
      ],
    },
    {
      label: 'Languages & Tools',
      icon: Layers,
      accent: '#06b6d4',
      items: [
        { name: 'JavaScript', logo: javascriptIcon },
        { name: 'Git', logo: gitIcon },
        { name: 'GitHub', logo: githubIcon },
      ],
    },
  ];

  const allSkills = skillGroups.flatMap((g) => g.items);

  const certifications = [
    {
      title: 'Associate Cloud Engineer',
      issuer: 'Google Cloud',
      date: '2024',
      badge: 'Verified',
      color: '#4285F4',
      skills: ['GCP', 'Cloud Architecture', 'App Engine', 'Docker'],
      link: 'https://cloud.google.com/certification',
    },
    {
      title: 'Meta Certified Mobile Developer',
      issuer: 'Meta',
      date: '2024',
      badge: 'Certified',
      color: '#0666E5',
      skills: ['React Native', 'Mobile UI/UX', 'REST Integration'],
      link: 'https://www.coursera.org/professional-certificates/meta-android-developer',
    },
    {
      title: 'Firebase Application Professional',
      issuer: 'Google / Firebase',
      date: '2024',
      badge: 'Professional',
      color: '#FFCA28',
      skills: ['Firestore', 'Authentication', 'Cloud Functions'],
      link: 'https://firebase.google.com/',
    },
    {
      title: 'Flutter Cross-Platform Engineering',
      issuer: 'Google Developer Ecosystem',
      date: '2023',
      badge: 'Specialist',
      color: '#02569B',
      skills: ['Flutter', 'Dart', 'GetX', 'BLoC'],
      link: 'https://flutter.dev',
    },
  ];

  const achievements = [
    {
      title: 'Top-Rated Freelancer on Upwork',
      category: 'Client Excellence',
      stat: '100%',
      statLabel: 'Job Success Score',
      description: 'Maintained a 100% Job Success Rate delivering cross-platform mobile solutions for international clients.',
      color: '#14a800',
    },
    {
      title: '4 Production Apps Shipped',
      category: 'Engineering Impact',
      stat: '04',
      statLabel: 'Shipped Apps',
      description: 'Architected and launched NuraHelp, ProGear, PayOff, and BrainStorm across iOS and Android.',
      color: '#7c3aed',
    },
    {
      title: 'Healthcare AI Innovation Finalist',
      category: 'Award & Recognition',
      stat: 'Top 5',
      statLabel: 'Hackathon Finalist',
      description: 'Recognized for designing NuraHelp — integrating AI consultation with real-time appointment scheduling.',
      color: '#34d399',
    },
    {
      title: 'Offline-First Payment Engine',
      category: 'Technical Milestone',
      stat: '< 50ms',
      statLabel: 'QR Auth',
      description: 'Engineered PayOff with local encrypted storage and QR transaction sync for seamless offline P2P transfers.',
      color: '#06b6d4',
    },
  ];

  const heroLinks = [
    { href: 'https://github.com/OkwJosh', icon: Github, label: 'GitHub' },
    { href: 'https://linkedin.com/in/joshokw', icon: Linkedin, label: 'LinkedIn' },
    { href: 'https://www.upwork.com/freelancers/~01a1d8b4e20769fc75?mp_source=share', icon: 'image', image: upworkLogo, label: 'Upwork' },
    { href: 'mailto:okwjosh123@gmail.com', icon: Mail, label: 'Email' },
  ];

  const stats = [
    { value: '04', label: 'Shipped Projects' },
    { value: '13+', label: 'Technologies' },
    { value: '100%', label: 'Cross-Platform' },
    { value: '∞', label: 'Curiosity' },
  ];

  const whatIDo = [
    { icon: Smartphone, text: 'Cross-platform mobile apps' },
    { icon: Zap, text: 'Realtime & offline-first features' },
    { icon: Layers, text: 'Clean, scalable architecture' },
    { icon: Server, text: 'APIs, auth & payments' },
  ];

  const contactLinks = [
    { href: 'https://github.com/OkwJosh', icon: Github, label: 'GitHub', sub: '@OkwJosh', color: '#8b5cf6' },
    { href: 'https://linkedin.com/in/joshokw', icon: Linkedin, label: 'LinkedIn', sub: 'in/joshokw', color: '#06b6d4' },
    { href: 'https://www.upwork.com/freelancers/~01a1d8b4e20769fc75?mp_source=share', icon: 'image', image: upworkLogo, label: 'Upwork', sub: 'Hire me', color: '#14a800' },
    { href: 'mailto:okwjosh123@gmail.com', icon: Mail, label: 'Email', sub: 'okwjosh123@gmail.com', color: '#f472b6' },
  ];

  // ─── Demo View ───
  if (selectedDemo) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <nav className="fixed top-0 w-full glass-nav z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
            <motion.button
              onClick={() => setSelectedDemo(null)}
              className="flex items-center gap-2 px-4 py-2.5 btn-glass rounded-xl text-sm font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={18} />
              <span>Back to Portfolio</span>
            </motion.button>
            <h1 className="text-base font-semibold gradient-text">{selectedDemo.title} Demo</h1>
          </div>
        </nav>

        <motion.div
          className="pt-24 px-6 pb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-6xl mx-auto">
            <div className="glow-card rounded-2xl overflow-hidden">
              <div className="p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <h2 className="text-2xl font-bold gradient-text mb-2">{selectedDemo.title}</h2>
                <p style={{ color: 'var(--text-secondary)' }}>{selectedDemo.description}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedDemo.tech.map((tech, i) => (
                    <span key={i} className="tech-badge px-3 py-1 rounded-full text-xs font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-6 flex justify-center">
                <iframe
                  src={selectedDemo.demo}
                  style={{
                    maxHeight: '70vh',
                    maxWidth: '100%',
                    width: '100%',
                    height: '60vh',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border-color)',
                  }}
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={`${selectedDemo.title} Demo`}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* ─── Intro Splash ─── */}
      <AnimatePresence>
        {showIntro && <IntroScreen onComplete={handleIntroComplete} />}
      </AnimatePresence>

      {/* ─── Scroll Progress ─── */}
      <motion.div className="scroll-progress" style={{ scaleX: progressScaleX }} />

      {/* ─── Navigation ─── */}
      <motion.nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${navScrolled ? 'glass-nav' : 'bg-transparent'}`}
        style={navScrolled ? { boxShadow: 'var(--shadow-md)' } : {}}
        initial={{ y: -100 }}
        animate={!showIntro ? { y: 0 } : { y: -100 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <motion.button
            onClick={() => scrollToSection('home')}
            className="flex items-center gap-2.5"
            whileHover={{ scale: 1.02 }}
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent-border)' }}>
              <Code size={16} style={{ color: 'var(--accent)' }} />
            </span>
            <h1 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Okwoli<span style={{ color: 'var(--accent)' }}>.</span>
            </h1>
          </motion.button>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item)}
                className="relative px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors duration-300"
                style={{ color: activeSection === item ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {activeSection === item && (
                  <motion.span layoutId="navPill" className="nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                )}
                <span className="relative z-10">{item}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <motion.a
              href={resumePDF}
              download="Okwoli_Joshua.pdf"
              className="hidden sm:flex btn-primary items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white relative overflow-hidden"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <Download size={16} />
              <span>Resume</span>
            </motion.a>

            <motion.button
              onClick={() => setDarkMode(!darkMode)}
              className="theme-toggle p-2 rounded-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </motion.button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="md:hidden glass"
              style={{ borderTop: '1px solid var(--border-color)' }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 py-4 space-y-1">
                {navItems.map((item, i) => (
                  <motion.button
                    key={item}
                    onClick={() => scrollToSection(item)}
                    className="block w-full text-left capitalize py-3 px-4 rounded-xl text-sm font-medium transition-all"
                    style={{
                      color: activeSection === item ? 'var(--accent)' : 'var(--text-muted)',
                      background: activeSection === item ? 'var(--accent-muted)' : 'transparent',
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    {item}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ─── Hero Section ─── */}
      <section id="home" className="relative min-h-screen flex items-center pt-28 pb-16 px-6 overflow-hidden">
        <div className="hero-grid-overlay" />
        <div className="blob blob-1" />
        <div className="blob blob-2" />

        <motion.div
          className="max-w-7xl mx-auto w-full relative z-10"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <motion.div
              className="space-y-6 order-2 lg:order-1"
              initial={{ opacity: 0, x: -50 }}
              animate={!showIntro ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
                style={{ border: '1px solid var(--accent-border)', background: 'var(--accent-muted)', color: 'var(--accent)' }}
                initial={{ opacity: 0, y: 10 }}
                animate={!showIntro ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.6 }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10b981' }} />
                Available for opportunities
              </motion.div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight">
                <span style={{ color: 'var(--text-primary)' }}>Building</span>{' '}
                <span className="gradient-text-hero">delightful</span>
                <br />
                <span style={{ color: 'var(--text-primary)' }}>mobile experiences.</span>
              </h1>

              <motion.p
                className="text-lg leading-relaxed max-w-xl"
                style={{ color: 'var(--text-secondary)' }}
                initial={{ opacity: 0 }}
                animate={!showIntro ? { opacity: 1 } : {}}
                transition={{ delay: 0.8 }}
              >
                I'm <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Okwoli Joshua</span> — a Flutter
                developer crafting efficient, user-focused apps with Flutter, Firebase, and modern tooling.
              </motion.p>

              <motion.div
                className="flex flex-wrap items-center gap-3 pt-2"
                initial={{ opacity: 0, y: 20 }}
                animate={!showIntro ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 1 }}
              >
                <motion.button
                  onClick={() => scrollToSection('projects')}
                  className="btn-primary flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white relative overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>View My Work</span>
                  <ArrowRight size={18} />
                </motion.button>

                {heroLinks.map((link) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    target={link.href.startsWith('mailto') ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    className="btn-glass flex items-center justify-center w-12 h-12 rounded-xl"
                    style={{ color: 'var(--text-secondary)' }}
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={link.label}
                    title={link.label}
                  >
                    {link.icon === 'image' ? (
                      <img
                        src={link.image}
                        alt={link.label}
                        className="w-[22px] h-[22px] object-contain"
                        style={{ filter: 'brightness(0) saturate(100%) invert(66%) sepia(8%) saturate(592%) hue-rotate(200deg) brightness(85%) contrast(110%)' }}
                      />
                    ) : (
                      <link.icon size={20} />
                    )}
                  </motion.a>
                ))}
              </motion.div>
            </motion.div>

            {/* Right - Portrait with floating badges */}
            <motion.div
              className="relative flex justify-center lg:justify-end order-1 lg:order-2"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={!showIntro ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <div className="relative w-[280px] sm:w-[340px] md:w-[400px]">
                <div className="absolute -inset-8 rounded-full blur-3xl" style={{ background: 'var(--blob-1)' }} />

                <motion.div
                  className="portrait-frame relative z-10 aspect-[4/5]"
                  animate={{ y: [0, -14, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <img src={profileImg} alt="Okwoli Joshua" />
                </motion.div>

                {/* floating badge: role */}
                <motion.div
                  className="hero-badge absolute -left-4 top-10 z-20"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <img src={flutterIcon} alt="" />
                  Flutter Developer
                </motion.div>

                {/* floating badge: status */}
                <motion.div
                  className="hero-badge absolute -right-2 bottom-12 z-20"
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                >
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10b981' }} />
                  Open to work
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.button
            onClick={() => scrollToSection('about')}
            className="hidden md:flex absolute -bottom-2 left-1/2 -translate-x-1/2 flex-col items-center gap-2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Scroll</span>
            <ChevronDown size={20} style={{ color: 'var(--accent)' }} />
          </motion.button>
        </motion.div>
      </section>

      {/* ─── Stats Band ─── */}
      <section className="relative px-6 pb-4">
        <StaggerContainer className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat, i) => (
            <motion.div key={i} variants={staggerChild}>
              <SpotlightCard className="text-center" innerClassName="py-5 px-4">
                <div className="stat-num gradient-text">{stat.value}</div>
                <p className="text-[0.7rem] font-medium mt-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </StaggerContainer>
      </section>

      {/* ─── About Section (Bento) ─── */}
      <section id="about" className="relative py-24 px-6 aurora-bg">
        <div className="max-w-7xl mx-auto relative z-10">
          <AnimatedSection>
            <Eyebrow>About</Eyebrow>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                A bit <span className="gradient-text">about me</span>
              </h2>
              <p className="text-base max-w-md" style={{ color: 'var(--text-muted)' }}>
                Turning ideas into polished products — across the full mobile stack.
              </p>
            </div>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-5 auto-rows-fr">
            {/* Intro — large tile */}
            <motion.div variants={staggerChild} className="md:col-span-2 md:row-span-2 h-full">
              <SpotlightCard className="h-full">
                <div className="flex flex-col h-full">
                  <span className="card-icon mb-4"><Code size={20} /></span>
                  <p className="text-xl md:text-2xl font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                    I craft elegant, performant apps with <span className="gradient-text">delightful user experiences</span>.
                  </p>
                  <p className="text-sm leading-relaxed mt-4" style={{ color: 'var(--text-secondary)' }}>
                    With hands-on experience in Flutter, Firebase, and scalable backends, I translate ideas into
                    real products. I enjoy working across the stack, leading implementation, and collaborating
                    with teams to ship value quickly and reliably.
                  </p>
                  <div className="mt-auto pt-6 flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                    <img src={profileImg} alt="Okwoli Joshua" className="w-11 h-11 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Okwoli Joshua</p>
                      <p className="text-xs">Flutter Developer & Software Engineer</p>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>

            {/* What I do */}
            <motion.div variants={staggerChild} className="h-full">
              <SpotlightCard accent="#34d399" className="h-full">
                <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>What I do</h3>
                <ul className="space-y-3">
                  {whatIDo.map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className="card-icon" style={{ '--spot-accent': '#34d399', width: 32, height: 32, borderRadius: '0.6rem' }}>
                        <item.icon size={15} />
                      </span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </SpotlightCard>
            </motion.div>

            {/* Currently */}
            <motion.div variants={staggerChild} className="h-full">
              <SpotlightCard accent="#f472b6" className="h-full">
                <span className="card-icon mb-4" style={{ '--spot-accent': '#f472b6' }}><Sparkles size={20} /></span>
                <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Currently</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Open to roles & freelance work. Deepening my software-engineering foundations and shipping side projects.
                </p>
              </SpotlightCard>
            </motion.div>

            {/* Strengths — full width */}
            <motion.div variants={staggerChild} className="md:col-span-3 h-full">
              <SpotlightCard accent="#7c3aed" className="h-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Core strengths</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Clean architecture · DX · Quality</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Cross-platform Apps', 'State Management (GetX/BLoC)', 'Realtime (Firebase)',
                    'Auth & Payments', 'CI/CD', 'API Design', 'Testing', 'UI/UX Systems',
                  ].map((tag, i) => (
                    <motion.span
                      key={i}
                      className="tech-badge px-4 py-2.5 rounded-xl text-xs font-medium"
                      whileHover={{ scale: 1.05 }}
                    >
                      {tag}
                    </motion.span>
                  ))}
                </div>
              </SpotlightCard>
            </motion.div>
          </StaggerContainer>
        </div>
      </section>

      {/* ─── Skills Section ─── */}
      <section id="skills" className="relative py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <AnimatedSection>
            <Eyebrow>Skills</Eyebrow>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                My <span className="gradient-text">toolkit</span>
              </h2>
              <p className="text-base max-w-md" style={{ color: 'var(--text-muted)' }}>
                Technologies I reach for to deliver robust, production-ready products.
              </p>
            </div>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-5 auto-rows-fr">
            {skillGroups.map((group, gi) => (
              <motion.div key={gi} variants={staggerChild} className="h-full">
                <SpotlightCard accent={group.accent} className="h-full">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="card-icon" style={{ '--spot-accent': group.accent }}>
                      <group.icon size={20} />
                    </span>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{group.label}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {group.items.map((skill, si) => (
                      <motion.div
                        key={si}
                        whileHover={{ y: -3 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                      >
                        <img src={skill.logo} alt={skill.name} className="w-5 h-5 object-contain" />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{skill.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>

        {/* Continuous marquee */}
        <AnimatedSection delay={0.2} className="mt-10">
          <div className="marquee">
            <div className="marquee-track">
              {[...allSkills, ...allSkills].map((skill, i) => (
                <div key={i} className="marquee-chip">
                  <img src={skill.logo} alt={skill.name} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{skill.name}</span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ─── Projects Section ─── */}
      <section id="projects" className="relative py-24 px-6 aurora-bg">
        <div className="dot-grid" />
        <div className="max-w-7xl mx-auto relative z-10">
          <AnimatedSection>
            <Eyebrow>Projects</Eyebrow>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Featured <span className="gradient-text">work</span>
              </h2>
              <p className="text-base max-w-md" style={{ color: 'var(--text-muted)' }}>
                Shipped products — hover to explore, click to watch each one in action.
              </p>
            </div>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-5 auto-rows-fr" staggerDelay={0.12}>
            {projects.map((project, index) => {
              const featured = index === 0 || index === 3;
              return (
                <div key={index} className={featured ? 'md:col-span-2' : ''}>
                  <ProjectCard project={project} index={index} onOpen={setSelectedDemo} featured={featured} />
                </div>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── Achievements & Certifications Section ─── */}
      <section id="achievements" className="relative py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <AnimatedSection>
            <Eyebrow>Credentials &amp; Milestones</Eyebrow>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Achievements &amp; <span className="gradient-text">Certifications</span>
              </h2>
              <p className="text-base max-w-md" style={{ color: 'var(--text-muted)' }}>
                Verified industry certifications, client excellence metrics, and engineering awards.
              </p>
            </div>
          </AnimatedSection>

          {/* Key Achievements Grid */}
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {achievements.map((item, i) => (
              <motion.div key={i} variants={staggerChild} className="h-full">
                <SpotlightCard accent={item.color} className="h-full" innerClassName="p-6 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-3xl font-extrabold" style={{ color: item.color }}>{item.stat}</span>
                      <span className="text-[0.7rem] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>{item.statLabel}</span>
                    </div>
                    <span className="text-[0.65rem] uppercase tracking-widest font-mono font-medium" style={{ color: 'var(--accent)' }}>{item.category}</span>
                    <h3 className="text-base font-bold mt-1 mb-2" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </StaggerContainer>

          {/* Certifications Grid */}
          <AnimatedSection delay={0.2}>
            <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Verified Certifications</h3>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certifications.map((cert, i) => (
              <motion.a
                key={i}
                href={cert.link}
                target="_blank"
                rel="noopener noreferrer"
                variants={staggerChild}
                className="block group"
              >
                <SpotlightCard accent={cert.color} innerClassName="p-5 flex flex-col justify-between gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold group-hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text-primary)' }}>{cert.title}</h4>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{cert.issuer} · {cert.date}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[0.65rem] font-semibold uppercase tracking-wider" style={{ background: 'var(--accent-muted)', color: cert.color, border: '1px solid var(--accent-border)' }}>
                      {cert.badge}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cert.skills.map((skill, si) => (
                      <span key={si} className="tech-badge px-2.5 py-1 rounded-lg text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </SpotlightCard>
              </motion.a>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── Contact Section ─── */}
      <section id="contact" className="relative py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <AnimatedSection>
            <Eyebrow>Contact</Eyebrow>
          </AnimatedSection>

          <div className="grid lg:grid-cols-[1fr_1fr] gap-5 items-stretch">
            {/* Statement / primary CTA */}
            <AnimatedSection delay={0.1} className="h-full">
              <SpotlightCard className="h-full" innerClassName="flex flex-col justify-between gap-7 p-7">
                <div>
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-4">
                    Let's build <span className="gradient-text">something great</span>.
                  </h2>
                  <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                    Have a project or role in mind? I'm available for new opportunities and would love to hear from you.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <motion.a
                    href="mailto:okwjosh123@gmail.com"
                    className="btn-primary flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white relative overflow-hidden"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Mail size={18} />
                    Send a message
                  </motion.a>
                  <motion.a
                    href="https://calendar.app.google/dhw5oV78rkQKnZSo8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-glass flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Calendar size={18} style={{ color: 'var(--accent)' }} />
                    Book a call
                  </motion.a>
                </div>
              </SpotlightCard>
            </AnimatedSection>

            {/* Contact link cards */}
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contactLinks.map((link) => (
                <motion.a
                  key={link.label}
                  variants={staggerChild}
                  href={link.href}
                  target={link.href.startsWith('mailto') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  className="h-full"
                >
                  <SpotlightCard accent={link.color} className="h-full" innerClassName="flex flex-col gap-3 p-6">
                    <div className="flex items-center justify-between">
                      <span className="card-icon" style={{ '--spot-accent': link.color }}>
                        {link.icon === 'image' ? (
                          <img src={link.image} alt={link.label} className="w-5 h-5 object-contain" style={{ filter: 'brightness(0) saturate(100%) invert(45%) sepia(96%) saturate(1817%) hue-rotate(88deg) brightness(94%) contrast(88%)' }} />
                        ) : (
                          <link.icon size={20} />
                        )}
                      </span>
                      <ArrowUpRight size={18} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{link.label}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{link.sub}</p>
                    </div>
                  </SpotlightCard>
                </motion.a>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="footer-gradient relative pt-16 px-6 overflow-hidden" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between gap-10 pb-12">
            <div className="max-w-sm">
              <h3 className="text-2xl font-bold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>
                Okwoli<span style={{ color: 'var(--accent)' }}>.</span>
              </h3>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-muted)' }}>
                Flutter developer building polished, user-focused mobile apps. Open to new opportunities worldwide.
              </p>
              <div className="flex items-center gap-3">
                {[
                  { href: 'https://github.com/OkwJosh', icon: Github },
                  { href: 'https://linkedin.com/in/joshokw', icon: Linkedin },
                  { href: 'mailto:okwjosh123@gmail.com', icon: Mail },
                ].map((link, i) => (
                  <motion.a
                    key={i}
                    href={link.href}
                    target={link.href.startsWith('mailto') ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                    style={{ color: 'var(--text-muted)', background: 'var(--accent-muted)', border: '1px solid var(--border-color)' }}
                    whileHover={{ scale: 1.1, y: -2, color: 'var(--accent)' }}
                  >
                    <link.icon size={17} />
                  </motion.a>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-primary)' }}>Explore</p>
                <ul className="space-y-2.5">
                  {navItems.map((item) => (
                    <li key={item}>
                      <button onClick={() => scrollToSection(item)} className="footer-link text-sm capitalize">{item}</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-primary)' }}>Connect</p>
                <ul className="space-y-2.5">
                  {[
                    { href: 'https://github.com/OkwJosh', label: 'GitHub' },
                    { href: 'https://linkedin.com/in/joshokw', label: 'LinkedIn' },
                    { href: 'https://www.upwork.com/freelancers/~01a1d8b4e20769fc75?mp_source=share', label: 'Upwork' },
                    { href: 'mailto:okwjosh123@gmail.com', label: 'Email' },
                  ].map((link) => (
                    <li key={link.label}>
                      <a href={link.href} target={link.href.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer" className="footer-link text-sm">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 py-6" style={{ borderTop: '1px solid var(--border-color)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              &copy; 2026 Okwoli Joshua &middot; Flutter Developer &amp; Software Engineer
            </p>
            <button onClick={() => scrollToSection('home')} className="footer-link text-xs flex items-center gap-1.5">
              Back to top <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        <div className="footer-wordmark select-none -mb-4 md:-mb-10">OKWOLI</div>
      </footer>
    </div>
  );
}
