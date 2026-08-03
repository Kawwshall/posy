"use client";

import { useEffect, useRef } from "react";

// Dependency-free canvas confetti. Fires a celebratory burst whenever the
// `trigger` value changes. Respects prefers-reduced-motion.
export function Confetti({ trigger }: { trigger: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (trigger === 0) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const W = window.innerWidth;
    const H = window.innerHeight;
    const colors = ["#db2777", "#f472b6", "#fb923c", "#fbbf24", "#34d399", "#60a5fa"];
    const N = 140;

    type P = { x: number; y: number; vx: number; vy: number; r: number; c: string; rot: number; vr: number; shape: number; life: number };
    const parts: P[] = [];
    // Two side cannons + a center pop, aimed upward.
    for (let i = 0; i < N; i++) {
      const side = i % 3;
      const originX = side === 0 ? W * 0.15 : side === 1 ? W * 0.85 : W * 0.5;
      const originY = side === 2 ? H * 0.55 : H * 0.7;
      const angle = side === 0 ? -Math.PI / 3 : side === 1 ? -Math.PI + Math.PI / 3 : -Math.PI / 2;
      const speed = 8 + Math.random() * 9;
      const spread = (Math.random() - 0.5) * 1.1;
      parts.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed - 4,
        r: 4 + Math.random() * 5,
        c: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        shape: (Math.random() * 3) | 0,
        life: 1,
      });
    }

    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const p of parts) {
        p.vy += 0.28; // gravity
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (frame > 60) p.life -= 0.012;
        if (p.life <= 0 || p.y > H + 40) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        if (p.shape === 0) ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
        else if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, p.r / 1.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.r);
          ctx.lineTo(p.r, p.r);
          ctx.lineTo(-p.r, p.r);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      if (alive && frame < 260) raf.current = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, W, H);
    };
    raf.current = requestAnimationFrame(draw);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
