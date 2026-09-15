import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

const COMMANDS = [
  {
    name: 'scan',
    icon: '🔍',
    desc: 'Crawl a live URL or local files, discover interactive elements, infer AXAG annotations, and enter interactive review.',
    usage: 'axag scan https://shop.example.com',
    link: '/docs/commands/scan',
  },
  {
    name: 'apply',
    icon: '✅',
    desc: 'Write accepted annotations back to your source HTML, JSX, or TSX files with automatic backup.',
    usage: 'axag apply --dry-run',
    link: '/docs/commands/apply',
  },
  {
    name: 'report',
    icon: '📊',
    desc: 'Generate comprehensive reports in HTML, Markdown, or JSON format from the last scan results.',
    usage: 'axag report --format html',
    link: '/docs/commands/report',
  },
  {
    name: 'validate',
    icon: '✓',
    desc: 'Validate existing AXAG annotations against the specification at any conformance level.',
    usage: 'axag validate --level AA',
    link: '/docs/commands/validate',
  },
  {
    name: 'init',
    icon: '⚙️',
    desc: 'Initialize AXAG configuration in your project with interactive setup prompts.',
    usage: 'axag init',
    link: '/docs/commands/init',
  },
];

export default function CommandCards(): JSX.Element {
  return (
    <div className={styles.grid}>
      {COMMANDS.map((cmd) => (
        <Link key={cmd.name} className={styles.card} to={cmd.link}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>{cmd.icon}</span>
            <code className={styles.cardName}>axag {cmd.name}</code>
          </div>
          <p className={styles.cardDesc}>{cmd.desc}</p>
          <code className={styles.cardUsage}>$ {cmd.usage}</code>
        </Link>
      ))}
    </div>
  );
}
