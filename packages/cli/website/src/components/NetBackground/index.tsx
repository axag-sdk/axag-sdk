import React, { useRef, useEffect, useCallback } from 'react';
import styles from './styles.module.css';

interface Point {
  ox: number; oy: number;
  x: number; y: number;
  phaseX: number; phaseY: number;
  ampX: number; ampY: number;
  vx: number; vy: number;
}

const CONFIG = {
  spacing: 65, jitter: 30, maxDistance: 150, dotRadius: 1.8,
  floatAmpMin: 8, floatAmpMax: 22, floatSpeed: 0.0004,
  mouseRadius: 200, mouseRepel: 0.06,
  lineColor: [124, 45, 194] as [number, number, number],
  dotColor: [107, 33, 168] as [number, number, number],
  lineAlphaMax: 0.28, dotAlpha: 0.45, edgePad: 80,
};

function rn(min: number, max: number) { return Math.random() * (max - min) + min; }
function clamp(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v; }

export default function NetBackground(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const rafRef = useRef(0);
  const dprRef = useRef(1);

  const buildPoints = useCallback((w: number, h: number) => {
    const { spacing, jitter, edgePad, floatAmpMin, floatAmpMax } = CONFIG;
    const pts: Point[] = [];
    const cols = Math.ceil((w + edgePad * 2) / spacing);
    const rows = Math.ceil((h + edgePad * 2) / spacing);
    for (let i = 0; i <= cols; i++) {
      for (let j = 0; j <= rows; j++) {
        const bx = -edgePad + i * spacing + rn(-jitter, jitter);
        const by = -edgePad + j * spacing + rn(-jitter, jitter);
        pts.push({ ox: bx, oy: by, x: bx, y: by, phaseX: rn(0, Math.PI * 2), phaseY: rn(0, Math.PI * 2), ampX: rn(floatAmpMin, floatAmpMax), ampY: rn(floatAmpMin, floatAmpMax), vx: rn(-0.15, 0.15), vy: rn(-0.15, 0.15) });
      }
    }
    pointsRef.current = pts;
  }, []);

  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = dprRef.current;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const pts = pointsRef.current;
    const mouse = mouseRef.current;
    const { maxDistance, dotRadius, floatSpeed, mouseRadius, mouseRepel, lineColor, dotColor, lineAlphaMax, dotAlpha } = CONFIG;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    const t = time * floatSpeed;

    for (const p of pts) {
      p.x = p.ox + Math.sin(t + p.phaseX) * p.ampX;
      p.y = p.oy + Math.cos(t * 0.8 + p.phaseY) * p.ampY;
      p.ox += p.vx * 0.05;
      p.oy += p.vy * 0.05;
      const pad = CONFIG.edgePad + 20;
      if (p.ox < -pad) p.ox = w + pad;
      if (p.ox > w + pad) p.ox = -pad;
      if (p.oy < -pad) p.oy = h + pad;
      if (p.oy > h + pad) p.oy = -pad;
      if (mouse.active) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseRadius && dist > 0) {
          const force = (1 - dist / mouseRadius) * mouseRepel;
          p.x += (dx / dist) * force * mouseRadius;
          p.y += (dy / dist) * force * mouseRadius;
        }
      }
    }

    const [lr, lg, lb] = lineColor;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDistance) {
          const alpha = clamp((1 - dist / maxDistance) * 1.5, 0, 1) * lineAlphaMax;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${lr},${lg},${lb},${alpha.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    const [dr, dg, db] = dotColor;
    ctx.fillStyle = `rgba(${dr},${dg},${db},${dotAlpha})`;
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      const w = window.innerWidth, h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      buildPoints(w, h);
    };
    const onMouse = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY, active: true }; };
    const onMouseLeave = () => { mouseRef.current.active = false; };
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', onMouse);
    document.addEventListener('mouseleave', onMouseLeave);
    if (!prefersReducedMotion) { rafRef.current = requestAnimationFrame(animate); } else { animate(0); }
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', onMouse);
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [animate, buildPoints]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
