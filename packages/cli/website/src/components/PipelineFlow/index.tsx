import React from 'react';
import styles from './styles.module.css';

const STEPS = [
  { icon: '🔍', label: 'Scan', desc: 'Crawl live URLs or local files to find interactive UI elements' },
  { icon: '🧠', label: 'Infer', desc: 'Apply 25+ heuristic rules + optional AI to generate annotations' },
  { icon: '👁️', label: 'Review', desc: 'Interactively accept, reject, or modify each annotation' },
  { icon: '✅', label: 'Apply', desc: 'Write confirmed annotations back to your HTML / JSX / TSX files' },
  { icon: '📊', label: 'Report', desc: 'Generate HTML, Markdown, or JSON reports for docs and CI' },
];

export default function PipelineFlow(): JSX.Element {
  return (
    <div className={styles.pipeline}>
      {STEPS.map((step, i) => (
        <React.Fragment key={step.label}>
          <div className={styles.step}>
            <div className={styles.icon}>{step.icon}</div>
            <h4 className={styles.label}>{step.label}</h4>
            <p className={styles.desc}>{step.desc}</p>
          </div>
          {i < STEPS.length - 1 && <div className={styles.arrow}>▸</div>}
        </React.Fragment>
      ))}
    </div>
  );
}
