"""Production-quality starter scaffolds — HTML/CSS class names are kept in sync."""

PREMIUM_STATIC_FILES: dict[str, str] = {
    "index.html": """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="A modern, responsive website built with semantic HTML and CSS.">
    <title>Studio — Modern digital experiences</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <a class="site-skip" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="site-container site-header__inner">
        <a class="site-logo" href="#">Studio</a>
        <button class="site-nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
          <span class="site-nav-toggle__bar"></span>
          <span class="site-nav-toggle__bar"></span>
        </button>
        <nav id="site-nav" class="site-nav" aria-label="Primary">
          <a class="site-nav__link" href="#work">Work</a>
          <a class="site-nav__link" href="#services">Services</a>
          <a class="site-nav__link" href="#about">About</a>
          <a class="site-nav__link site-nav__link--cta" href="#contact">Contact</a>
        </nav>
      </div>
    </header>

    <main id="main">
      <section class="site-hero">
        <div class="site-container site-hero__grid">
          <div class="site-hero__copy">
            <p class="site-eyebrow">Design · Build · Launch</p>
            <h1 class="site-title">Craft premium websites that feel effortless.</h1>
            <p class="site-lead">
              We help teams ship polished digital products with clear typography,
              thoughtful spacing, and responsive layouts that work everywhere.
            </p>
            <div class="site-actions">
              <a class="site-btn site-btn--primary" href="#work">View work</a>
              <a class="site-btn site-btn--ghost" href="#contact">Start a project</a>
            </div>
          </div>
          <div class="site-hero__visual" aria-hidden="true">
            <div class="site-panel site-panel--glow">
              <div class="site-panel__metric">
                <span class="site-panel__value">98%</span>
                <span class="site-panel__label">Client satisfaction</span>
              </div>
              <div class="site-panel__metric">
                <span class="site-panel__value">24h</span>
                <span class="site-panel__label">Prototype turnaround</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="work" class="site-section">
        <div class="site-container">
          <div class="site-section__head">
            <p class="site-eyebrow">Selected work</p>
            <h2 class="site-heading">Projects built for clarity and conversion.</h2>
          </div>
          <div class="site-grid site-grid--cards">
            <article class="site-card">
              <div class="site-card__media"></div>
              <div class="site-card__body">
                <h3 class="site-card__title">Northline Commerce</h3>
                <p class="site-card__text">E-commerce refresh with faster checkout and mobile-first product pages.</p>
              </div>
            </article>
            <article class="site-card">
              <div class="site-card__media site-card__media--alt"></div>
              <div class="site-card__body">
                <h3 class="site-card__title">Atlas Analytics</h3>
                <p class="site-card__text">Dashboard marketing site with crisp data storytelling and dark mode UI.</p>
              </div>
            </article>
            <article class="site-card">
              <div class="site-card__media site-card__media--warm"></div>
              <div class="site-card__body">
                <h3 class="site-card__title">Harbor Health</h3>
                <p class="site-card__text">Accessible patient portal landing experience with WCAG-friendly contrast.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="services" class="site-section site-section--muted">
        <div class="site-container site-split">
          <div>
            <p class="site-eyebrow">Services</p>
            <h2 class="site-heading">Everything you need to launch with confidence.</h2>
          </div>
          <ul class="site-list">
            <li class="site-list__item"><strong>Brand sites</strong> — positioning, layout systems, responsive pages</li>
            <li class="site-list__item"><strong>Product UI</strong> — component-ready CSS and interaction polish</li>
            <li class="site-list__item"><strong>Performance</strong> — lean assets, semantic markup, no layout shift</li>
          </ul>
        </div>
      </section>

      <section id="contact" class="site-section">
        <div class="site-container site-cta">
          <div>
            <p class="site-eyebrow">Contact</p>
            <h2 class="site-heading">Ready to build something remarkable?</h2>
            <p class="site-lead site-lead--compact">Tell us about your project and we will reply within one business day.</p>
          </div>
          <form class="site-form" action="#" method="post">
            <label class="site-field">
              <span class="site-field__label">Name</span>
              <input class="site-field__input" type="text" name="name" required>
            </label>
            <label class="site-field">
              <span class="site-field__label">Email</span>
              <input class="site-field__input" type="email" name="email" required>
            </label>
            <label class="site-field">
              <span class="site-field__label">Message</span>
              <textarea class="site-field__input site-field__input--area" name="message" rows="4" required></textarea>
            </label>
            <button class="site-btn site-btn--primary site-btn--block" type="submit">Send message</button>
          </form>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="site-container site-footer__inner">
        <p class="site-footer__copy">© 2026 Studio. Built with semantic HTML &amp; CSS.</p>
      </div>
    </footer>
    <script src="script.js"></script>
  </body>
</html>
""",
    "styles.css": """/* Premium static site design system — keep .site-* selectors intact when customizing */
:root {
  --site-bg: #070b14;
  --site-bg-elevated: #0d1424;
  --site-bg-muted: #101827;
  --site-surface: rgba(255, 255, 255, 0.04);
  --site-border: rgba(255, 255, 255, 0.08);
  --site-text: #eef2ff;
  --site-text-muted: #94a3b8;
  --site-accent: #60a5fa;
  --site-accent-strong: #818cf8;
  --site-radius: 16px;
  --site-radius-sm: 10px;
  --site-shadow: 0 24px 80px rgba(2, 6, 23, 0.45);
  --site-container: 1120px;
  --site-font: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: var(--site-font);
  color: var(--site-text);
  background:
    radial-gradient(circle at top, rgba(96, 165, 250, 0.12), transparent 32%),
    linear-gradient(180deg, #05070f, var(--site-bg));
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

img { max-width: 100%; display: block; }
a { color: inherit; }

.site-container {
  width: min(100% - 2rem, var(--site-container));
  margin-inline: auto;
}

.site-skip {
  position: absolute;
  left: -9999px;
  top: 0;
  background: var(--site-accent);
  color: #04101f;
  padding: 0.5rem 0.75rem;
  z-index: 100;
}
.site-skip:focus { left: 1rem; top: 1rem; }

.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(16px);
  background: rgba(7, 11, 20, 0.72);
  border-bottom: 1px solid var(--site-border);
}
.site-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 72px;
}
.site-logo {
  font-weight: 700;
  letter-spacing: -0.03em;
  text-decoration: none;
  font-size: 1.1rem;
}
.site-nav {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.site-nav__link {
  text-decoration: none;
  color: var(--site-text-muted);
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  transition: background 0.2s ease, color 0.2s ease;
}
.site-nav__link:hover,
.site-nav__link:focus-visible {
  color: var(--site-text);
  background: var(--site-surface);
  outline: none;
}
.site-nav__link--cta {
  color: #04101f;
  background: linear-gradient(135deg, var(--site-accent), var(--site-accent-strong));
  font-weight: 600;
}

.site-nav-toggle {
  display: none;
  background: transparent;
  border: 0;
  padding: 0.4rem;
}
.site-nav-toggle__bar {
  display: block;
  width: 22px;
  height: 2px;
  margin: 5px 0;
  background: var(--site-text);
  border-radius: 999px;
}

.site-hero { padding: 5rem 0 3.5rem; }
.site-hero__grid {
  display: grid;
  gap: 2.5rem;
  align-items: center;
}
.site-eyebrow {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--site-accent);
  font-weight: 600;
}
.site-title {
  margin: 0 0 1rem;
  font-size: clamp(2.2rem, 5vw, 4rem);
  line-height: 1.05;
  letter-spacing: -0.04em;
  max-width: 12ch;
}
.site-lead {
  margin: 0;
  color: var(--site-text-muted);
  font-size: 1.08rem;
  max-width: 52ch;
}
.site-lead--compact { max-width: 42ch; }
.site-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  margin-top: 1.75rem;
}

.site-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 1.15rem;
  border-radius: 999px;
  border: 1px solid transparent;
  text-decoration: none;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}
.site-btn:hover { transform: translateY(-1px); }
.site-btn--primary {
  color: #04101f;
  background: linear-gradient(135deg, var(--site-accent), var(--site-accent-strong));
  box-shadow: 0 12px 40px rgba(96, 165, 250, 0.25);
}
.site-btn--ghost {
  color: var(--site-text);
  border-color: var(--site-border);
  background: var(--site-surface);
}
.site-btn--block { width: 100%; }

.site-panel {
  padding: 1.5rem;
  border-radius: calc(var(--site-radius) + 4px);
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
  border: 1px solid var(--site-border);
  box-shadow: var(--site-shadow);
}
.site-panel--glow {
  background:
    radial-gradient(circle at top right, rgba(129, 140, 248, 0.25), transparent 40%),
    linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
}
.site-panel__metric + .site-panel__metric { margin-top: 1.25rem; }
.site-panel__value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}
.site-panel__label { color: var(--site-text-muted); font-size: 0.92rem; }

.site-section { padding: 4.5rem 0; }
.site-section--muted { background: rgba(255, 255, 255, 0.02); }
.site-section__head { margin-bottom: 2rem; max-width: 48rem; }
.site-heading {
  margin: 0;
  font-size: clamp(1.7rem, 3vw, 2.5rem);
  letter-spacing: -0.03em;
}

.site-grid { display: grid; gap: 1.25rem; }
.site-grid--cards { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }

.site-card {
  overflow: hidden;
  border-radius: var(--site-radius);
  background: var(--site-bg-elevated);
  border: 1px solid var(--site-border);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.site-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--site-shadow);
}
.site-card__media {
  height: 180px;
  background: linear-gradient(135deg, rgba(96,165,250,0.35), rgba(129,140,248,0.15));
}
.site-card__media--alt {
  background: linear-gradient(135deg, rgba(45,212,191,0.28), rgba(96,165,250,0.12));
}
.site-card__media--warm {
  background: linear-gradient(135deg, rgba(251,191,36,0.28), rgba(244,114,182,0.12));
}
.site-card__body { padding: 1.15rem 1.2rem 1.35rem; }
.site-card__title { margin: 0 0 0.45rem; font-size: 1.05rem; }
.site-card__text { margin: 0; color: var(--site-text-muted); font-size: 0.95rem; }

.site-split {
  display: grid;
  gap: 2rem;
  align-items: start;
}
.site-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}
.site-list__item {
  padding: 1rem 1.1rem;
  border-radius: var(--site-radius-sm);
  background: var(--site-bg-elevated);
  border: 1px solid var(--site-border);
}

.site-cta {
  display: grid;
  gap: 2rem;
  align-items: start;
  padding: 2rem;
  border-radius: calc(var(--site-radius) + 6px);
  border: 1px solid var(--site-border);
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015));
}
.site-form { display: grid; gap: 1rem; }
.site-field { display: grid; gap: 0.4rem; }
.site-field__label { font-size: 0.88rem; color: var(--site-text-muted); }
.site-field__input {
  width: 100%;
  border-radius: var(--site-radius-sm);
  border: 1px solid var(--site-border);
  background: rgba(255,255,255,0.03);
  color: var(--site-text);
  padding: 0.75rem 0.85rem;
  font: inherit;
}
.site-field__input:focus {
  outline: 2px solid rgba(96, 165, 250, 0.35);
  border-color: var(--site-accent);
}
.site-field__input--area { resize: vertical; min-height: 120px; }

.site-footer {
  border-top: 1px solid var(--site-border);
  padding: 1.5rem 0 2rem;
}
.site-footer__inner { display: flex; justify-content: center; }
.site-footer__copy { margin: 0; color: var(--site-text-muted); font-size: 0.92rem; }

@media (max-width: 860px) {
  .site-nav-toggle { display: block; }
  .site-nav {
    position: absolute;
    inset: 72px 1rem auto;
    display: none;
    flex-direction: column;
    align-items: stretch;
    padding: 0.75rem;
    border-radius: var(--site-radius);
    background: var(--site-bg-elevated);
    border: 1px solid var(--site-border);
    box-shadow: var(--site-shadow);
  }
  .site-nav.is-open { display: flex; }
  .site-header__inner { position: relative; }
  .site-hero { padding-top: 3.5rem; }
}

@media (min-width: 900px) {
  .site-hero__grid { grid-template-columns: 1.1fr 0.9fr; }
  .site-split { grid-template-columns: 1fr 1fr; }
  .site-cta { grid-template-columns: 1fr 1fr; }
}
""",
    "script.js": """(() => {
  const toggle = document.querySelector(".site-nav-toggle");
  const nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      nav?.classList.remove("is-open");
      toggle?.setAttribute("aria-expanded", "false");
    });
  });
})();
""",
}

_NEXTJS_GLOBALS_CSS = """:root {
  --bg: #070b14;
  --bg-elevated: #0d1424;
  --border: rgba(255, 255, 255, 0.08);
  --text: #eef2ff;
  --text-muted: #94a3b8;
  --accent: #60a5fa;
  --accent-strong: #818cf8;
  --radius: 16px;
  --container: 1120px;
  --font: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: var(--font);
  color: var(--text);
  background: radial-gradient(circle at top, rgba(96, 165, 250, 0.12), transparent 32%), linear-gradient(180deg, #05070f, var(--bg));
  line-height: 1.6;
}
a { color: inherit; text-decoration: none; }
.container { width: min(100% - 2rem, var(--container)); margin-inline: auto; }
.page { min-height: 100vh; }
.topbar {
  position: sticky; top: 0; z-index: 20;
  backdrop-filter: blur(16px);
  background: rgba(7, 11, 20, 0.72);
  border-bottom: 1px solid var(--border);
}
.topbar__inner {
  display: flex; align-items: center; justify-content: space-between;
  min-height: 72px; gap: 1rem;
}
.brand { font-weight: 700; letter-spacing: -0.03em; }
.nav { display: flex; gap: 0.35rem; align-items: center; }
.nav a {
  color: var(--text-muted); padding: 0.55rem 0.85rem; border-radius: 999px;
}
.nav a:hover { color: var(--text); background: rgba(255,255,255,0.04); }
.nav__cta {
  color: #04101f !important;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  font-weight: 600;
}
.hero { padding: 5rem 0 3.5rem; }
.hero__grid { display: grid; gap: 2.5rem; align-items: center; }
.eyebrow {
  margin: 0 0 0.75rem; font-size: 0.78rem; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--accent); font-weight: 600;
}
.title {
  margin: 0 0 1rem; font-size: clamp(2.2rem, 5vw, 4rem);
  line-height: 1.05; letter-spacing: -0.04em; max-width: 12ch;
}
.lead { margin: 0; color: var(--text-muted); font-size: 1.08rem; max-width: 52ch; }
.actions { display: flex; flex-wrap: wrap; gap: 0.85rem; margin-top: 1.75rem; }
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 46px; padding: 0 1.15rem; border-radius: 999px;
  border: 1px solid transparent; font-weight: 600; cursor: pointer;
}
.btn--primary {
  color: #04101f;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  box-shadow: 0 12px 40px rgba(96, 165, 250, 0.25);
}
.btn--ghost { border-color: var(--border); background: rgba(255,255,255,0.04); }
.btn--block { width: 100%; }
.hero__panel {
  padding: 1.5rem; border-radius: calc(var(--radius) + 4px);
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.45);
}
.metric + .metric { margin-top: 1.25rem; }
.metric strong { display: block; font-size: 2rem; }
.metric span { color: var(--text-muted); font-size: 0.92rem; }
.section { padding: 4.5rem 0; }
.section--muted { background: rgba(255,255,255,0.02); }
.heading { margin: 0 0 2rem; font-size: clamp(1.7rem, 3vw, 2.5rem); letter-spacing: -0.03em; }
.cards { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.card {
  overflow: hidden; border-radius: var(--radius); background: var(--bg-elevated);
  border: 1px solid var(--border); transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.card:hover { transform: translateY(-4px); box-shadow: 0 24px 80px rgba(2, 6, 23, 0.45); }
.card__media { height: 180px; background: linear-gradient(135deg, rgba(96,165,250,0.35), rgba(129,140,248,0.15)); }
.card__body { padding: 1.15rem 1.2rem 1.35rem; }
.card__body h3 { margin: 0 0 0.45rem; font-size: 1.05rem; }
.card__body p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }
.cta {
  display: grid; gap: 2rem; padding: 2rem; border-radius: calc(var(--radius) + 6px);
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015));
}
.form { display: grid; gap: 1rem; }
.input {
  width: 100%; border-radius: 10px; border: 1px solid var(--border);
  background: rgba(255,255,255,0.03); color: var(--text);
  padding: 0.75rem 0.85rem; font: inherit;
}
.input--area { min-height: 120px; resize: vertical; }
@media (min-width: 900px) {
  .hero__grid { grid-template-columns: 1.1fr 0.9fr; }
  .cta { grid-template-columns: 1fr 1fr; align-items: start; }
}
"""

PREMIUM_NEXTJS_FILES: dict[str, str] = {
    "package.json": (
        '{"name":"generated-app","private":true,"scripts":{"dev":"next dev",'
        '"build":"next build","start":"next start"},'
        '"dependencies":{"next":"15.1.0","react":"19.0.0","react-dom":"19.0.0"},'
        '"devDependencies":{"typescript":"5.7.2","@types/react":"19.0.1","@types/node":"22.10.2"}}'
    ),
    "tsconfig.json": (
        '{"compilerOptions":{"target":"ES2017","lib":["dom","dom.iterable","esnext"],'
        '"allowJs":true,"skipLibCheck":true,"strict":true,"noEmit":true,'
        '"module":"esnext","moduleResolution":"bundler","jsx":"preserve",'
        '"incremental":true},"include":["next-env.d.ts","**/*.ts","**/*.tsx"],'
        '"exclude":["node_modules"]}'
    ),
    "app/layout.tsx": """import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studio — Modern digital experiences",
  description: "A premium Next.js starter with responsive layout and polished UI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
""",
    "app/page.tsx": """export default function HomePage() {
  return (
    <main className="page">
      <header className="topbar">
        <div className="container topbar__inner">
          <span className="brand">Studio</span>
          <nav className="nav" aria-label="Primary">
            <a href="#work">Work</a>
            <a href="#services">Services</a>
            <a href="#contact" className="nav__cta">Contact</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container hero__grid">
          <div>
            <p className="eyebrow">Design · Build · Launch</p>
            <h1 className="title">Craft premium websites that feel effortless.</h1>
            <p className="lead">
              Responsive layout, refined typography, and production-ready structure out of the box.
            </p>
            <div className="actions">
              <a className="btn btn--primary" href="#work">View work</a>
              <a className="btn btn--ghost" href="#contact">Start a project</a>
            </div>
          </div>
          <div className="hero__panel" aria-hidden="true">
            <div className="metric"><strong>98%</strong><span>Client satisfaction</span></div>
            <div className="metric"><strong>24h</strong><span>Prototype turnaround</span></div>
          </div>
        </div>
      </section>

      <section id="work" className="section">
        <div className="container">
          <h2 className="heading">Selected work</h2>
          <div className="cards">
            {["Northline Commerce", "Atlas Analytics", "Harbor Health"].map((title) => (
              <article key={title} className="card">
                <div className="card__media" />
                <div className="card__body">
                  <h3>{title}</h3>
                  <p>Polished marketing experience with strong visual hierarchy.</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="section section--muted">
        <div className="container cta">
          <div>
            <h2 className="heading">Ready to build something remarkable?</h2>
            <p className="lead">Tell us about your project and we will reply within one business day.</p>
          </div>
          <form className="form">
            <input className="input" placeholder="Name" aria-label="Name" />
            <input className="input" placeholder="Email" aria-label="Email" />
            <textarea className="input input--area" placeholder="Message" aria-label="Message" />
            <button className="btn btn--primary btn--block" type="button">Send message</button>
          </form>
        </div>
      </section>
    </main>
  );
}
""",
    "app/globals.css": _NEXTJS_GLOBALS_CSS,
}
