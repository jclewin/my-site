import { useEffect, useRef } from "react";

type RGB = readonly [number, number, number];

const CYAN: RGB = [45, 226, 230];
const PINK: RGB = [255, 118, 255];
const YELLOW: RGB = [255, 211, 25];
const PURPLE: RGB = [186, 92, 230];
const HORIZON = 0.66;

type Trail = {
  y: number;
  speed: number;
  length: number;
  thickness: number;
  color: RGB;
  seed: number;
};

const PALETTE: RGB[] = [PINK, CYAN, YELLOW, PURPLE];

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

const TRAILS: Trail[] = Array.from({ length: 18 }, (_, index) => ({
  y: 0.3 + hash(index + 2) * 0.5,
  speed: 0.07 + hash(index + 9) * 0.16,
  length: 0.18 + hash(index + 14) * 0.26,
  thickness: 1.15 + hash(index + 19) * 1.7,
  color: PALETTE[index % PALETTE.length],
  seed: hash(index + 24),
}));

const STARS = Array.from({ length: 42 }, (_, index) => ({
  x: hash(index + 3),
  y: hash(index + 30) * 0.4,
  size: 0.6 + hash(index + 50) * 1.3,
  phase: hash(index + 70) * Math.PI * 2,
  color: index % 5 === 0 ? CYAN : index % 7 === 0 ? PINK : ([244, 244, 245] as RGB),
}));

function point(progress: number, y: number, width: number, height: number) {
  const lean = 1 - progress * 0.7;
  return {
    x: progress * width,
    y: (HORIZON + (y - HORIZON) * lean) * height,
  };
}

function paintWash(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const sky = ctx.createLinearGradient(0, height * 0.2, 0, height * 0.92);
  sky.addColorStop(0, "rgba(17, 17, 19, 0)");
  sky.addColorStop(0.42, "rgba(84, 13, 110, 0.28)");
  sky.addColorStop(0.62, "rgba(255, 118, 255, 0.16)");
  sky.addColorStop(0.74, "rgba(255, 211, 25, 0.1)");
  sky.addColorStop(1, "rgba(17, 17, 19, 0)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(
    width * 0.5,
    height * HORIZON,
    width * 0.02,
    width * 0.5,
    height * HORIZON,
    width * 0.48,
  );
  glow.addColorStop(0, "rgba(255, 118, 255, 0.2)");
  glow.addColorStop(0.45, "rgba(84, 13, 110, 0.1)");
  glow.addColorStop(1, "rgba(17, 17, 19, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function paintStars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  scale: number,
) {
  for (const star of STARS) {
    const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 1.3 + star.phase));
    const [r, g, b] = star.color;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.55 * twinkle})`;
    const size = Math.max(1, star.size * scale);
    ctx.fillRect(star.x * width, star.y * height, size, size);
  }
}

function paintTrail(
  ctx: CanvasRenderingContext2D,
  trail: Trail,
  time: number,
  width: number,
  height: number,
  scale: number,
  glow: boolean,
) {
  const head = ((time * trail.speed + trail.seed) % 1.35) - 0.18;
  const tail = head - trail.length;
  if (head < -0.05 || tail > 1.05) return;

  const from = point(tail, trail.y, width, height);
  const to = point(head, trail.y, width, height);
  const [r, g, b] = trail.color;
  const fade = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  fade.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
  fade.addColorStop(0.62, `rgba(${r}, ${g}, ${b}, ${glow ? 0.16 : 0.4})`);
  fade.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${glow ? 0.5 : 1})`);

  ctx.strokeStyle = fade;
  ctx.lineWidth = (glow ? trail.thickness * 8 : trail.thickness) * scale;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  if (glow) return;
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.95)`;
  ctx.beginPath();
  ctx.arc(to.x, to.y, Math.max(1.2, trail.thickness * 1.15) * scale, 0, Math.PI * 2);
  ctx.fill();
}

export default function ProjectTrails() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const started = performance.now();
    let frame = 0;
    let alive = true;
    let visible = true;

    const draw = (time: number) => {
      const cssWidth = parent.clientWidth;
      const cssHeight = parent.clientHeight;
      if (cssWidth < 2 || cssHeight < 2) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(cssWidth * dpr));
      const height = Math.max(1, Math.round(cssHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const scale = width / cssWidth;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#111113";
      ctx.fillRect(0, 0, width, height);
      paintWash(ctx, width, height);
      paintStars(ctx, width, height, time, scale);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (const trail of TRAILS) {
        paintTrail(ctx, trail, time, width, height, scale, true);
        paintTrail(ctx, trail, time, width, height, scale, false);
      }
    };

    const tick = (now: number) => {
      frame = 0;
      if (!alive || !visible || document.hidden || motion.matches) return;
      draw((now - started) / 1000);
      frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!frame && alive && visible && !document.hidden && !motion.matches) {
        frame = requestAnimationFrame(tick);
      }
    };

    const resize = () => {
      draw(motion.matches ? 2.4 : (performance.now() - started) / 1000);
      wake();
    };

    const onMotion = () => {
      if (motion.matches) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        draw(2.4);
        return;
      }
      wake();
    };

    const onVisibility = () => {
      if (!document.hidden) wake();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) wake();
    });
    intersection.observe(parent);
    motion.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", onVisibility);
    resize();

    return () => {
      alive = false;
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="projects-trails" aria-hidden="true" />;
}
