"use client";
import { useEffect, useRef } from "react";

/** Fundo animado: orbes de luz que sobem devagar, com parallax de scroll e ponteiro. */
export function Fundo({ cor }: { cor: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, mx = 0, my = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const orbes = Array.from({ length: 26 }, (_, i) => ({
      x: Math.random(), y: Math.random(), r: 40 + Math.random() * 130, v: 0.00004 + Math.random() * 0.00012,
      d: 0.15 + Math.random() * 0.6, quente: i % 3 === 0,
    }));
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const hexA = (a: number, quente: boolean) => {
      const n = parseInt(cor.slice(1), 16);
      const [r, g, b] = quente ? [255, 179, 71] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      return `rgba(${r},${g},${b},${a})`;
    };
    const desenhar = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const sy = window.scrollY;
      for (const o of orbes) {
        if (!reduzir) o.y -= o.v * 16;
        if (o.y < -0.2) o.y = 1.2;
        const x = o.x * w + mx * 30 * o.d;
        const y = o.y * h - ((sy * o.d * 0.25) % (h * 1.4)) + my * 20 * o.d;
        const yy = ((y % (h * 1.4)) + h * 1.4) % (h * 1.4) - h * 0.2;
        const g = ctx.createRadialGradient(x, yy, 0, x, yy, o.r);
        g.addColorStop(0, hexA(o.quente ? 0.1 : 0.16, o.quente));
        g.addColorStop(1, hexA(0, o.quente));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, yy, o.r, 0, Math.PI * 2); ctx.fill();
      }
      void t;
      if (!reduzir) raf = requestAnimationFrame(desenhar);
    };
    const mover = (e: PointerEvent) => { mx = e.clientX / w - 0.5; my = e.clientY / h - 0.5; };
    const visivel = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(desenhar); };
    resize(); raf = requestAnimationFrame(desenhar);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", mover, { passive: true });
    document.addEventListener("visibilitychange", visivel);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", mover);
      document.removeEventListener("visibilitychange", visivel);
    };
  }, [cor]);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
