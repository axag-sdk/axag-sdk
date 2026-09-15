import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';
import NetBackground from '../components/NetBackground';
import TerminalDemo from '../components/TerminalDemo';
import PipelineFlow from '../components/PipelineFlow';
import CommandCards from '../components/CommandCards';
import InstallBlock from '../components/InstallBlock';

/* ─── Features ───────────────────────────────── */

const FEATURES = [
  {
    icon: '🧠',
    title: 'AI-Powered Inference',
    desc: 'Optional OpenAI / Anthropic integration boosts low-confidence heuristic results with contextual LLM reasoning.',
  },
  {
    icon: '👁️',
    title: 'Interactive Review',
    desc: 'Accept, reject, modify, or skip every annotation before anything touches your code. You stay in control.',
  },
  {
    icon: '📊',
    title: 'Multi-Format Reports',
    desc: 'Generate self-contained HTML dashboards, clean Markdown for PRs, or structured JSON for CI pipelines.',
  },
  {
    icon: '🔗',
    title: 'CI Integration',
    desc: 'Drop a GitHub Actions workflow to validate AXAG annotations on every pull request with configurable conformance levels.',
  },
  {
    icon: '🛡️',
    title: 'Safety-Aware',
    desc: 'Risk classification, confirmation gates, and approval requirements are inferred automatically for destructive actions.',
  },
  {
    icon: '📦',
    title: 'Zero Config',
    desc: 'Works out of the box with npx. Optional axag.config.json for domain hints, AI settings, and validation rules.',
  },
];

/* ─── Quick Start Steps ──────────────────────── */

const QUICKSTART = [
  { step: '1', label: 'Initialize', code: 'axag init' },
  { step: '2', label: 'Scan', code: 'axag scan https://your-app.com' },
  { step: '3', label: 'Apply', code: 'axag apply' },
  { step: '4', label: 'Validate', code: 'axag validate --level AA' },
];

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} — ${siteConfig.tagline}`}
      description="CLI tool to scan websites, infer AXAG annotations, review interactively, and apply semantic contracts automatically."
    >
      <NetBackground />

      {/* ── Hero ──────────────────────────── */}
      <header className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroPrompt}>&gt;_</span> axag-cli
            </h1>
            <p className={styles.heroTagline}>{siteConfig.tagline}</p>

            <InstallBlock />

            <div className={styles.heroCtas}>
              <Link className={styles.btnPrimary} to="/docs/getting-started">
                Get Started
              </Link>
              <Link
                className={styles.btnSecondary}
                href="https://github.com/axag-cli/axag-cli"
              >
                View on GitHub
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* ── Pipeline ────────────────────── */}
        <section className={styles.section}>
          <div className="container">
            <h2 className={styles.sectionTitle}>How It Works</h2>
            <p className={styles.sectionSub}>
              Five steps from zero annotations to a fully agent-accessible interface.
            </p>
            <PipelineFlow />
          </div>
        </section>

        {/* ── Terminal Demo ───────────────── */}
        <section className={styles.sectionAlt}>
          <div className="container">
            <h2 className={styles.sectionTitle}>See It in Action</h2>
            <p className={styles.sectionSub}>
              Watch axag-cli scan a website, infer annotations, and walk through interactive review.
            </p>
            <TerminalDemo />
          </div>
        </section>

        {/* ── Commands ────────────────────── */}
        <section className={styles.section}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Commands</h2>
            <p className={styles.sectionSub}>
              Five powerful commands covering the full annotation lifecycle.
            </p>
            <CommandCards />
          </div>
        </section>

        {/* ── Features ────────────────────── */}
        <section className={styles.sectionAlt}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Features</h2>
            <p className={styles.sectionSub}>
              Everything you need to make your UI agent-accessible.
            </p>
            <div className={styles.featureGrid}>
              {FEATURES.map((f) => (
                <div key={f.title} className={styles.featureCard}>
                  <span className={styles.featureIcon}>{f.icon}</span>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Quick Start ─────────────────── */}
        <section className={styles.section}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Quick Start</h2>
            <p className={styles.sectionSub}>
              Four commands to go from zero to agent-accessible.
            </p>
            <div className={styles.quickstart}>
              {QUICKSTART.map((q) => (
                <div key={q.step} className={styles.qsStep}>
                  <div className={styles.qsNum}>{q.step}</div>
                  <div className={styles.qsBody}>
                    <span className={styles.qsLabel}>{q.label}</span>
                    <code className={styles.qsCode}>$ {q.code}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────── */}
        <section className={styles.ctaSection}>
          <div className="container">
            <h2 className={styles.ctaTitle}>Make Your UI Agent-Accessible</h2>
            <p className={styles.ctaSub}>
              axag-cli is open source and free. Part of the{' '}
              <a href="https://axag.org">AXAG Standard</a> ecosystem.
            </p>
            <div className={styles.ctaButtons}>
              <Link className={styles.btnPrimary} to="/docs/getting-started">
                Read the Docs
              </Link>
              <Link
                className={styles.btnSecondary}
                href="https://github.com/axag-cli/axag-cli"
              >
                Star on GitHub ⭐
              </Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
