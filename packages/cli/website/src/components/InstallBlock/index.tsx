import React, { useState } from 'react';
import styles from './styles.module.css';

const TABS = [
  { label: 'npm', command: 'npm install -g axag-cli' },
  { label: 'npx', command: 'npx axag-cli scan https://your-site.com' },
  { label: 'yarn', command: 'yarn global add axag-cli' },
];

export default function InstallBlock(): JSX.Element {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(TABS[active].command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.block}>
      <div className={styles.tabs}>
        {TABS.map((tab, i) => (
          <button
            key={tab.label}
            className={`${styles.tab} ${i === active ? styles.tabActive : ''}`}
            onClick={() => { setActive(i); setCopied(false); }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.codeRow}>
        <code className={styles.code}>$ {TABS[active].command}</code>
        <button className={styles.copyBtn} onClick={copy} aria-label="Copy command">
          {copied ? '✓' : '📋'}
        </button>
      </div>
    </div>
  );
}
