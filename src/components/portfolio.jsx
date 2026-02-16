import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion';
import { Github, Linkedin, Mail, Download, Menu, X, Video, ArrowLeft, ExternalLink, ChevronDown, Sun, Moon, Code, Briefcase } from 'lucide-react';
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

// ─── Floating Particles Component ───
function Particles({ count = 20 }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 3 + 1,
    left: Math.random() * 100,
    delay: Math.random() * 12,
    duration: Math.random() * 18 + 12,
    opacity: Math.random() * 0.3 + 0.1,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            bottom: '-10px',
            background: 'var(--accent)',
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

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
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

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
      {/* Central Profile Image */}
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

        {/* Name reveal */}
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
  const [showIntro, setShowIntro] = useState(true);
  const [navScrolled, setNavScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Parallax effect for hero
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  const handleIntroComplete = useCallback(() => setShowIntro(false), []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (showIntro) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [showIntro]);

  useEffect(() => {
    const handleNavScroll = () => {
      setNavScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleNavScroll);
    return () => window.removeEventListener('scroll', handleNavScroll);
  }, []);

  useEffect(() => {
    if (selectedDemo) {
      window.scrollTo(0, 0);
      return;
    }

    const handleScroll = () => {
      const sections = ['home', 'about', 'skills', 'projects', 'contact'];
      const scrollPosition = window.scrollY + 150;
      const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50;

      if (isAtBottom) {
        setActiveSection('contact');
        return;
      }

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const element = document.getElementById(section);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(section);
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

  const projects = [
    {
      title: 'NuraHelp',
      description: 'A Cross-platform appointment scheduling system with AI chat integration.',
      tech: ['Flutter', 'Firebase', 'REST APIs'],
      image: nurahelpImg,
      demo: 'https://player.vimeo.com/video/1165404715',
      color: '#34d399',
    },
    {
      title: 'ProGear',
      description: 'A comprehensive e-commerce app for gaming gear with seamless browsing, secure payments, and order tracking.',
      tech: ['Flutter', 'Dart', 'Firebase', 'GetX'],
      image: progearImg,
      demo: 'https://player.vimeo.com/video/1165377998',
      color: '#7c3aed',
    },
    {
      title: 'PayOff',
      description: 'An Offline First P2P payment app with QR code payments, transaction history, and secure auth.',
      tech: ['Flutter', 'Firebase', 'GetX'],
      image: payoffImg,
      demo: 'https://player.vimeo.com/video/1165405120',
      color: '#06b6d4',
    },
    {
      title: 'BrainStorm',
      description: 'A mindmapping app to visually organize ideas with nodes, connections.',
      tech: ['Flutter', 'Dart', 'Flutter Canvas', 'Shared Preferences'],
      image: brainstormImg,
      demo: 'https://player.vimeo.com/video/1165404664',
      color: '#f472b6',
    },

  ];

  const skills = [
    { name: 'Flutter', logo: flutterIcon },
    { name: 'Dart', logo: dartIcon },
    { name: 'Firebase', logo: firebaseIcon },
    { name: 'GetX', logo: getxIcon },
    { name: 'Python', logo: pythonIcon },
    { name: 'Django', logo: djangoIcon },
    { name: 'Javascript', logo: javascriptIcon },
    { name: 'Node JS', logo: nodeIcon },
    { name: 'Bloc', logo: blocIcon },
    { name: 'Git', logo: gitIcon },
    { name: 'REST APIs', logo: restIcon },
    { name: 'GitHub', logo: githubIcon },
    { name: 'MongoDB', logo: mongoDb },
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

      {/* ─── Navigation ─── */}
      <motion.nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${navScrolled ? 'glass-nav' : 'bg-transparent'}`}
        style={navScrolled ? { boxShadow: 'var(--shadow-md)' } : {}}
        initial={{ y: -100 }}
        animate={!showIntro ? { y: 0 } : { y: -100 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <Code size={18} style={{ color: 'var(--accent)' }} />
            <h1 className="text-base font-bold gradient-text">Okwoli Joshua</h1>
          </motion.div>

          <div className="hidden md:flex items-center gap-1">
            {['home', 'about', 'skills', 'projects', 'contact'].map((item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item)}
                className={`nav-link px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-300`}
                style={{
                  color: activeSection === item ? 'var(--accent)' : 'var(--text-muted)',
                  background: activeSection === item ? 'var(--accent-muted)' : 'transparent',
                }}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
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
                {['home', 'about', 'skills', 'projects', 'contact'].map((item, i) => (
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
      <section id="home" className="relative min-h-screen flex items-center pt-20 pb-20 px-6 overflow-hidden">
        {/* Animated background blobs */}
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <Particles count={25} />

        <motion.div
          className="max-w-7xl mx-auto w-full relative z-10"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <div className="flex flex-col md:flex-row justify-center items-center gap-12">
            {/* Left Content */}
            <motion.div
              className="flex-1 max-w-2xl space-y-5"
              initial={{ opacity: 0, x: -60 }}
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

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight">
                <span style={{ color: 'var(--text-primary)' }}>Hi, I'm</span>
                <br />
                <span className="gradient-text-hero">Okwoli Joshua</span>
              </h1>

              <motion.p
                className="text-lg md:text-xl leading-relaxed max-w-lg"
                style={{ color: 'var(--text-secondary)' }}
                initial={{ opacity: 0 }}
                animate={!showIntro ? { opacity: 1 } : {}}
                transition={{ delay: 0.8 }}
              >
                Flutter Developer | Aspiring Software Engineer | Tech Innovator
              </motion.p>

              <motion.p
                className="text-base max-w-md"
                style={{ color: 'var(--text-muted)' }}
                initial={{ opacity: 0 }}
                animate={!showIntro ? { opacity: 1 } : {}}
                transition={{ delay: 1 }}
              >
                I build efficient, user-focused mobile applications using Flutter, Firebase, and modern technologies.
              </motion.p>

              <motion.div
                className="flex flex-wrap items-center gap-3 pt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={!showIntro ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 1.1 }}
              >
                <motion.a
                  href={resumePDF}
                  download="Okwoli_Joshua.pdf"
                  className="btn-primary flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white relative z-10"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Download size={18} />
                  <span>Download Resume</span>
                </motion.a>

                {[
                  { href: 'https://github.com/OkwJosh', icon: Github, label: 'GitHub' },
                  { href: 'https://linkedin.com/in/joshokw', icon: Linkedin, label: 'LinkedIn' },
                  { href: 'https://www.upwork.com/freelancers/~01a1d8b4e20769fc75?mp_source=share', icon: 'image', image: upworkLogo, label: 'Upwork' },
                  { href: 'mailto:okwjosh123@gmail.com', icon: Mail, label: 'Email' },
                ].map((link) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    target={link.href.startsWith('mailto') ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    className="btn-glass flex items-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {link.icon === 'image' ? (
                      <img
                        src={link.image}
                        alt={link.label}
                        className="w-[22px] h-[22px] object-contain"
                        style={{
                          filter: 'brightness(0) saturate(100%) invert(66%) sepia(8%) saturate(592%) hue-rotate(200deg) brightness(85%) contrast(110%)'
                        }}
                      />
                    ) : (
                      <link.icon size={18} />
                    )}
                    <span>{link.label}</span>
                  </motion.a>
                ))}
              </motion.div>
            </motion.div>

            {/* Right - Profile Image */}
            <motion.div
              className="relative profile-float"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={!showIntro ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {/* Soft glow behind image */}
              <div className="absolute inset-4 rounded-full blur-3xl" style={{ background: 'var(--blob-1)' }} />

              {/* Circular profile image with subtle border */}
              <div className="relative rounded-full p-1" style={{ background: 'linear-gradient(135deg, var(--accent), rgba(16,185,129,0.4))' }}>
                <div className="rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)', padding: '3px' }}>
                  <img
                    src={profileImg}
                    alt="Okwoli Joshua"
                    className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full object-cover"
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Scroll</span>
            <ChevronDown size={20} style={{ color: 'var(--accent)' }} />
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Section Divider ─── */}
      <div className="section-divider" />

      {/* ─── About Section ─── */}
      <section id="about" className="relative py-24 px-6 aurora-bg">
        <div className="max-w-7xl mx-auto relative z-10">
          <AnimatedSection>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-[2px]" style={{ background: 'linear-gradient(to right, var(--accent), rgba(16,185,129,0.6))' }} />
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>About</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-8">
              <span className="gradient-text">About Me</span>
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatedSection delay={0.2}>
              <div className="glow-card p-8 rounded-2xl space-y-5 h-full">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
                  <Code style={{ color: 'var(--accent)' }} size={24} />
                </div>
                <p className="text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  I'm a Flutter developer with a passion for crafting elegant, performant apps with delightful user experiences.
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  With experience in Flutter, Firebase, and scalable backend services, I translate ideas into polished products.
                  I enjoy working across the stack, leading implementation, and collaborating with teams to ship value quickly and reliably.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.35}>
              <div className="glow-card p-8 rounded-2xl space-y-5 h-full">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Core Strengths</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Clean architecture &bull; DX &bull; Quality</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    'Cross-platform Apps',
                    'State Management (GetX/BLoC)',
                    'Realtime (Firebase)',
                    'Auth & Payments',
                    'CI/CD',
                    'API Design',
                    'Testing',
                    'UI/UX Systems',
                  ].map((tag, i) => (
                    <motion.span
                      key={i}
                      className="tech-badge px-4 py-2.5 rounded-xl text-xs font-medium"
                      whileHover={{ scale: 1.05, borderColor: 'rgba(124, 58, 237, 0.6)' }}
                    >
                      {tag}
                    </motion.span>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ─── Skills Section ─── */}
      <section id="skills" className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto relative z-10">
          <AnimatedSection>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-[2px]" style={{ background: 'linear-gradient(to right, var(--accent), rgba(168,85,247,0.6))' }} />
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Skills</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-3">
              <span className="gradient-text">My Toolkit</span>
            </h2>
            <p className="text-base mb-10 max-w-lg" style={{ color: 'var(--text-muted)' }}>
              Tools and technologies I use to deliver robust products.
            </p>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {skills.map((skill, index) => (
              <motion.div
                key={index}
                variants={staggerChild}
                className="skill-card glow-card p-5 rounded-2xl flex items-center gap-4 cursor-default"
              >
                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <img src={skill.logo} alt={skill.name} className="w-9 h-9 object-contain" />
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{skill.name}</span>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <div className="section-divider" />

      {/* ─── Projects Section ─── */}
      <section id="projects" className="relative py-24 px-6 aurora-bg">
        <div className="max-w-7xl mx-auto relative z-10">
          <AnimatedSection>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-[2px]" style={{ background: 'linear-gradient(to right, var(--accent), rgba(16,185,129,0.6))' }} />
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Projects</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-3">
              <span className="gradient-text">Featured Work</span>
            </h2>
            <p className="text-base mb-10 max-w-lg" style={{ color: 'var(--text-muted)' }}>
              Selected work showcasing product thinking and engineering depth.
            </p>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6" staggerDelay={0.15}>
            {projects.map((project, index) => (
              <motion.div
                key={index}
                variants={staggerChild}
                className="project-card glow-card rounded-2xl overflow-hidden group"
              >
                {/* Circular floating image + content side by side */}
                <div className="p-6 flex flex-col sm:flex-row items-center gap-5">
                  {/* Circular image with float */}
                  <motion.div
                    className="relative flex-shrink-0"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
                  >
                    <div
                      className="absolute -inset-1 rounded-full blur-md opacity-30"
                      style={{ background: project.color }}
                    />
                    <img
                      src={project.image}
                      alt={project.title}
                      className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover object-center relative z-10 border-2"
                      style={{ borderColor: 'var(--border-color)' }}
                    />
                  </motion.div>

                  {/* Text content */}
                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{project.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{project.description}</p>

                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      {project.tech.map((tech, i) => (
                        <span key={i} className="tech-badge px-3 py-1.5 rounded-lg text-xs font-medium">
                          {tech}
                        </span>
                      ))}
                    </div>

                    <motion.button
                      onClick={() => setSelectedDemo(project)}
                      className="demo-btn w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                      style={{ color: 'var(--accent)' }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Video size={18} />
                      <span>Watch Demo</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <div className="section-divider" />

      {/* ─── Contact Section ─── */}
      <section id="contact" className="relative py-24 px-6">
        <Particles count={10} />

        <div className="max-w-7xl mx-auto relative z-10">
          <AnimatedSection>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-[2px]" style={{ background: 'linear-gradient(to right, rgba(16,185,129,0.6), var(--accent))' }} />
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Contact</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-3">
              <span className="gradient-text">Let's Connect</span>
            </h2>
            <p className="text-base mb-10 max-w-lg" style={{ color: 'var(--text-muted)' }}>
              Have a project or role in mind? I'd love to hear from you.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="glow-card rounded-2xl p-8 max-w-2xl">
              <div className="flex flex-wrap items-center gap-4">
                {[
                  { href: 'https://github.com/OkwJosh', icon: Github, label: 'GitHub', color: '#8b5cf6' },
                  { href: 'https://linkedin.com/in/joshokw', icon: Linkedin, label: 'LinkedIn', color: '#06b6d4' },
                  { href: 'https://www.upwork.com/freelancers/~01a1d8b4e20769fc75?mp_source=share', icon: 'image', image: upworkLogo, label: 'Upwork', color: '#14a800' },
                  { href: 'mailto:okwjosh123@gmail.com', icon: Mail, label: 'Email', color: '#f472b6' },
                  { href: 'https://calendar.app.google/dhw5oV78rkQKnZSo8', icon: Video, label: 'Book a Call', color: '#34d399' },
                ].map((link) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    target={link.href.startsWith('mailto') ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-medium transition-all duration-300"
                    style={{
                      background: `${link.color}10`,
                      border: `1px solid ${link.color}30`,
                      color: link.color,
                    }}
                    whileHover={{
                      scale: 1.05,
                      boxShadow: `0 0 20px ${link.color}30`,
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {link.icon === 'image' ? (
                      <img
                        src={link.image}
                        alt={link.label}
                        className="w-[18px] h-[18px] object-contain"
                        style={{ filter: 'brightness(0) saturate(100%) invert(45%) sepia(96%) saturate(1817%) hue-rotate(88deg) brightness(94%) contrast(88%)' }}
                      />
                    ) : (
                      <link.icon size={18} />
                    )}
                    <span>{link.label}</span>
                    <ExternalLink size={14} className="opacity-50" />
                  </motion.a>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="footer-gradient py-10 px-6" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <motion.p
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            &copy; 2025 Okwoli Joshua Okwoli. Crafted with{' '}
            <span style={{ color: 'var(--accent)' }}>&hearts;</span> and React.
          </motion.p>

          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
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
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                style={{ color: 'var(--text-muted)', background: 'var(--accent-muted)' }}
                whileHover={{ scale: 1.1, y: -2 }}
              >
                <link.icon size={16} />
              </motion.a>
            ))}
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
