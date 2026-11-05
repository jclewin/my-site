import { useEffect, useRef } from "react";

type RGB = readonly [number, number, number];

const CYAN: RGB = [45, 226, 230];
const PINK: RGB = [255, 118, 255];
const YELLOW: RGB = [255, 211, 25];
const PURPLE: RGB = [186, 92, 230];

type Layer = {
  lift: number;
  spread: number;
  fibers: number;
  glow: number;
  core: number;
  alpha: number;
  from: RGB;
  to: RGB;
};

const LAYERS: Layer[] = [
  {
    lift: 0,
    spread: 0.2,
    fibers: 16,
    glow: 5,
    core: 1.2,
    alpha: 0.14,
    from: PURPLE,
    to: PINK,
  },
  {
    lift: 0,
    spread: 0.12,
    fibers: 26,
    glow: 2.4,
    core: 0.85,
    alpha: 0.42,
    from: CYAN,
    to: PINK,
  },
];

function mix(from: RGB, to: RGB, t: number): RGB {
  const clamped = Math.min(1, Math.max(0, t));
  return [
    Math.round(from[0] + (to[0] - from[0]) * clamped),
    Math.round(from[1] + (to[1] - from[1]) * clamped),
    Math.round(from[2] + (to[2] - from[2]) * clamped),
  ];
}

function strandY(
  along: number,
  time: number,
  across: number,
  spread: number,
  lift: number,
) {
  const drift = time * 0.28;
  const wave =
    Math.sin(along * 3.2 + drift) * 0.05 +
    Math.sin(along * 7.4 - drift * 0.45 + 0.6) * 0.018;
  const fold = 0.68 + 0.32 * Math.sin(along * Math.PI * 2 + time * 0.45);
  return 0.56 + lift + wave + across * spread * fold;
}

function paint(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  time: number,
  width: number,
  height: number,
  scale: number,
  glow: boolean,
  highlights: boolean,
) {
  const steps = 48;

  for (let i = 0; i < layer.fibers; i += 1) {
    const highlight = i % 7 === 3;
    if (highlight !== highlights) continue;
    const across = (i + 0.5) / layer.fibers * 2 - 1;
    const tint = highlight ? YELLOW : mix(layer.from, layer.to, (across + 1) / 2);
    const edge = 1 - Math.abs(across);
    const alpha =
      (highlight ? 0.72 : layer.alpha) * (glow ? 0.4 : 1) * (0.45 + 0.55 * edge);
    let open = false;

    ctx.beginPath();
    for (let step = 0; step <= steps; step += 1) {
      const along = step / steps;
      const x = along * width;
      const y =
        strandY(along, time, across, layer.spread, layer.lift) * height;
      if (!open) {
        ctx.moveTo(x, y);
        open = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${alpha})`;
    ctx.lineWidth = (glow ? layer.glow : layer.core) * scale;
    ctx.setLineDash([]);
    ctx.stroke();
  }
}

export default function ProjectFibers() {
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

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#111113";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const scale = width / cssWidth;
      for (const layer of LAYERS) {
        paint(ctx, layer, time, width, height, scale, true, false);
        paint(ctx, layer, time, width, height, scale, false, false);
      }
      ctx.globalCompositeOperation = "source-over";
      for (const layer of LAYERS) {
        paint(ctx, layer, time, width, height, scale, false, true);
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
      draw(motion.matches ? 1.4 : (performance.now() - started) / 1000);
      wake();
    };

    const onMotion = () => {
      if (motion.matches) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        draw(1.4);
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

  return <canvas ref={canvasRef} className="projects-fibers" aria-hidden="true" />;
}
