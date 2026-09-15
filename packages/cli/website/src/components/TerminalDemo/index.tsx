import React, { useState, useEffect, useRef } from 'react';
import styles from './styles.module.css';

interface TerminalLine {
  text: string;
  type: 'command' | 'output' | 'highlight' | 'success' | 'dim' | 'prompt';
  delay?: number;
}

const LINES: TerminalLine[] = [
  { text: '$ npx axag-cli scan https://shop.example.com', type: 'command', delay: 60 },
  { text: '', type: 'output', delay: 400 },
  { text: '  🔍 Scanning https://shop.example.com ...', type: 'dim', delay: 800 },
  { text: '  ✓ Found 24 interactive elements across 3 pages', type: 'success', delay: 600 },
  { text: '  ✓ Inferred 24 AXAG annotations (avg confidence: 82%)', type: 'success', delay: 400 },
  { text: '', type: 'output', delay: 200 },
  { text: '  ─── 1 / 24 ──────────────────────────────', type: 'dim', delay: 300 },
  { text: '  Element:  button#add-to-cart', type: 'output', delay: 200 },
  { text: '  Page:     https://shop.example.com/products', type: 'dim', delay: 200 },
  { text: '', type: 'output', delay: 100 },
  { text: '  Before (no AXAG):', type: 'dim', delay: 200 },
  { text: '    <button>Add to Cart</button>', type: 'output', delay: 300 },
  { text: '', type: 'output', delay: 100 },
  { text: '  After (with AXAG):', type: 'dim', delay: 200 },
  { text: '    <button', type: 'highlight', delay: 150 },
  { text: '      axag-intent="cart.add"', type: 'highlight', delay: 150 },
  { text: '      axag-entity="cart"', type: 'highlight', delay: 150 },
  { text: '      axag-action-type="write"', type: 'highlight', delay: 150 },
  { text: '      axag-risk-level="none"', type: 'highlight', delay: 150 },
  { text: '    >Add to Cart</button>', type: 'highlight', delay: 200 },
  { text: '', type: 'output', delay: 100 },
  { text: '  Confidence: ████████░░ 82%', type: 'success', delay: 300 },
  { text: '', type: 'output', delay: 100 },
  { text: '  ? Action?  ✔ Accept', type: 'success', delay: 500 },
  { text: '', type: 'output', delay: 200 },
  { text: '  ✓ 24/24 annotations reviewed. Run `axag apply` to apply.', type: 'success', delay: 400 },
];

export default function TerminalDemo(): JSX.Element {
  const [visibleLines, setVisibleLines] = useState(0);
  const [typing, setTyping] = useState('');
  const [isTypingCommand, setIsTypingCommand] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          startAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  function startAnimation() {
    let lineIdx = 0;

    function showNext() {
      if (lineIdx >= LINES.length) {
        // Restart after pause
        setTimeout(() => {
          setVisibleLines(0);
          setTyping('');
          setIsTypingCommand(true);
          hasStarted.current = false;
          lineIdx = 0;
          // Re-observe
          if (containerRef.current) {
            const obs = new IntersectionObserver(
              ([entry]) => {
                if (entry.isIntersecting && !hasStarted.current) {
                  hasStarted.current = true;
                  startAnimation();
                  obs.disconnect();
                }
              },
              { threshold: 0.3 },
            );
            obs.observe(containerRef.current);
          }
        }, 4000);
        return;
      }

      const line = LINES[lineIdx];

      if (line.type === 'command' && line.delay) {
        // Type out command character by character
        setIsTypingCommand(true);
        const chars = line.text.substring(2); // skip "$ "
        let charIdx = 0;
        setTyping('$ ');

        const typeInterval = setInterval(() => {
          charIdx++;
          setTyping('$ ' + chars.substring(0, charIdx));
          if (charIdx >= chars.length) {
            clearInterval(typeInterval);
            setTimeout(() => {
              setIsTypingCommand(false);
              setVisibleLines((v) => v + 1);
              lineIdx++;
              showNext();
            }, 300);
          }
        }, line.delay);
      } else {
        setTimeout(() => {
          setVisibleLines((v) => v + 1);
          lineIdx++;
          showNext();
        }, line.delay || 200);
      }
    }

    showNext();
  }

  return (
    <div ref={containerRef} className={styles.terminal}>
      <div className={styles.titleBar}>
        <span className={styles.dot} data-color="red" />
        <span className={styles.dot} data-color="yellow" />
        <span className={styles.dot} data-color="green" />
        <span className={styles.titleText}>axag-cli — Terminal</span>
      </div>
      <div className={styles.body}>
        {isTypingCommand && visibleLines === 0 && (
          <div className={styles.line}>
            <span className={styles.command}>{typing}</span>
            <span className={styles.cursor}>▋</span>
          </div>
        )}
        {LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className={`${styles.line} ${styles[line.type] || ''}`}>
            {line.text || '\u00A0'}
          </div>
        ))}
        {visibleLines > 0 && visibleLines < LINES.length && !isTypingCommand && (
          <span className={styles.cursor}>▋</span>
        )}
      </div>
    </div>
  );
}
