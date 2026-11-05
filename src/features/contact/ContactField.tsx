import { useEffect, useRef } from "react";
import { pixelRatio } from "../../utils/viewport";

const COLS = 8;
const ROWS = 26;
const SPEED = 1.45;

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

const STARS = Array.from({ length: 48 }, (_, index) => ({
  x: hash(index + 1),
  y: hash(index + 20) * 0.92,
  size: 0.6 + hash(index + 40) * 1.35,
  phase: hash(index + 60) * Math.PI * 2,
  gold: index % 9 === 0,
}));

const PEAKS = [0.05, 0.14, 0.07, 0.18, 0.08, 0.22, 0.1, 0.16, 0.06];

function paintSky(
  ctx: CanvasRenderingContext2D,
  width: number,
  horizonY: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  sky.addColorStop(0, "#111113");
  sky.addColorStop(0.42, "#16101f");
  sky.addColorStop(0.72, "#3a1454");
  sky.addColorStop(1, "#7a2d78");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizonY);

  const glow = ctx.createRadialGradient(
    width * 0.5,
    horizonY,
    width * 0.02,
    width * 0.5,
    horizonY,
    width * 0.42,
  );
  glow.addColorStop(0, "rgba(255, 211, 25, 0.28)");
  glow.addColorStop(0.35, "rgba(255, 118, 255, 0.2)");
  glow.addColorStop(1, "rgba(17, 17, 19, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, horizonY);
}

function paintStars(
  ctx: CanvasRenderingContext2D,
  width: number,
  horizonY: number,
  time: number,
  scale: number,
) {
  for (const star of STARS) {
    const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 1.2 + star.phase));
    ctx.fillStyle = star.gold
      ? `rgba(255, 211, 25, ${0.7 * twinkle})`
      : `rgba(244, 244, 245, ${0.55 * twinkle})`;
    const size = Math.max(1, star.size * scale);
    ctx.fillRect(star.x * width, star.y * horizonY, size, size);
  }
}

function paintSun(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  scale: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, 0);
  ctx.closePath();
  ctx.clip();

  const disc = ctx.createLinearGradient(cx, cy - radius, cx, cy);
  disc.addColorStop(0, "#ffd319");
  disc.addColorStop(0.42, "#ff76ff");
  disc.addColorStop(1, "#540d6e");
  ctx.fillStyle = disc;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius);

  ctx.fillStyle = "rgba(17, 17, 19, 0.4)";
  const stripe = Math.max(4, 11 * scale);
  for (let y = cy - radius; y < cy; y += stripe) {
    ctx.fillRect(cx - radius, y, radius * 2, stripe * 0.34);
  }
  ctx.restore();
}

function paintMountains(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  horizonY: number,
) {
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  PEAKS.forEach((peak, index) => {
    const x = (index / (PEAKS.length - 1)) * width;
    ctx.lineTo(x, horizonY - peak * height * 0.34);
  });
  ctx.lineTo(width, horizonY);
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, horizonY - height * 0.12, 0, horizonY);
  fill.addColorStop(0, "#2a1240");
  fill.addColorStop(1, "#120c16");
  ctx.fillStyle = fill;
  ctx.fill();
}

function paintFloor(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  horizonY: number,
) {
  const floor = ctx.createLinearGradient(0, horizonY, 0, height);
  floor.addColorStop(0, "#241028");
  floor.addColorStop(0.18, "#141218");
  floor.addColorStop(1, "#111113");
  ctx.fillStyle = floor;
  ctx.fillRect(0, horizonY, width, height - horizonY);
}

function paintHorizon(
  ctx: CanvasRenderingContext2D,
  width: number,
  horizonY: number,
  scale: number,
) {
  const glow = ctx.createLinearGradient(0, horizonY - 28 * scale, 0, horizonY + 18 * scale);
  glow.addColorStop(0, "rgba(255, 118, 255, 0)");
  glow.addColorStop(0.55, "rgba(255, 118, 255, 0.28)");
  glow.addColorStop(1, "rgba(45, 226, 230, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, horizonY - 28 * scale, width, 46 * scale);

  const line = ctx.createLinearGradient(0, horizonY, width, horizonY);
  line.addColorStop(0, "rgba(255, 118, 255, 0)");
  line.addColorStop(0.2, "rgba(255, 118, 255, 0.85)");
  line.addColorStop(0.5, "rgba(255, 211, 25, 0.95)");
  line.addColorStop(0.8, "rgba(45, 226, 230, 0.85)");
  line.addColorStop(1, "rgba(45, 226, 230, 0)");
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(1.25, 1.6 * scale);
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(width, horizonY);
  ctx.stroke();
}

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function paintGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  horizonY: number,
  time: number,
  scale: number,
) {
  const depth = Math.max(1, height - horizonY);
  const offset = (time * SPEED) % 1;
  ctx.lineCap = "butt";

  for (let col = -COLS; col <= COLS; col += 1) {
    if (col === 0) continue;
    const nx = col / COLS;
    const foot = width * 0.5 + nx * width * 1.22;
    ctx.strokeStyle = `rgba(255, 118, 255, ${0.22 + Math.abs(nx) * 0.35})`;
    ctx.lineWidth = Math.max(1, 1.15 * scale);
    ctx.beginPath();
    ctx.moveTo(width * 0.5, horizonY + 1);
    ctx.lineTo(foot, height);
    ctx.stroke();
  }

  const spine = ctx.createLinearGradient(width * 0.5, horizonY, width * 0.5, height);
  spine.addColorStop(0, "rgba(255, 211, 25, 0)");
  spine.addColorStop(0.18, "rgba(255, 211, 25, 0.75)");
  spine.addColorStop(0.72, "rgba(255, 211, 25, 0.75)");
  spine.addColorStop(1, "rgba(255, 211, 25, 0)");
  ctx.strokeStyle = spine;
  ctx.lineWidth = Math.max(1.2, 1.5 * scale);
  ctx.beginPath();
  ctx.moveTo(width * 0.5, horizonY);
  ctx.lineTo(width * 0.5, height);
  ctx.stroke();

  const overrun = 20 * scale;
  ctx.lineWidth = Math.max(1.75, 2 * scale);
  for (let row = 0; row < ROWS; row += 1) {
    const z = (row + offset) / ROWS;
    const p = z ** 1.75;
    const y = horizonY + p * (depth + overrun);
    if (y <= horizonY || y >= height + overrun) continue;
    const along = (y - horizonY) / depth;
    const appear = smoothstep(Math.min(1, along / 0.05));
    if (appear < 0.01) continue;
    const alpha = (0.22 + 0.7 * Math.min(1, along)) * appear;
    const half = width * 1.22 * Math.min(along, 1.05);
    ctx.strokeStyle = `rgba(45, 226, 230, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(width * 0.5 - half, y);
    ctx.lineTo(width * 0.5 + half, y);
    ctx.stroke();
  }
}

export default function ContactField() {
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
    let width = 0;
    let height = 0;
    let scale = 1;
    let horizonY = 0;
    let sunRadius = 0;

    const offsetWithin = (el: HTMLElement) => {
      let y = 0;
      let node: HTMLElement | null = el;
      while (node && node !== parent) {
        y += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      return node === parent ? y : el.offsetTop;
    };

    const measure = () => {
      const cssWidth = parent.clientWidth;
      const cssHeight = parent.clientHeight;
      if (cssWidth < 2 || cssHeight < 2) return false;

      const dpr = pixelRatio("canvas");
      width = Math.max(1, Math.round(cssWidth * dpr));
      height = Math.max(1, Math.round(cssHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      scale = width / cssWidth;
      const lede = parent.querySelector<HTMLElement>(".lede");
      const ledeBottom = lede
        ? offsetWithin(lede) + lede.offsetHeight
        : cssHeight * 0.28;
      const sunTop = ledeBottom + 12;
      const sunRadiusCss = Math.min(cssWidth * 0.28, cssHeight * 0.34);
      horizonY = (sunTop + sunRadiusCss) * scale;
      sunRadius = sunRadiusCss * scale;
      return true;
    };

    const draw = (time: number) => {
      if (width < 2 || height < 2) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#111113";
      ctx.fillRect(0, 0, width, height);
      paintSky(ctx, width, horizonY);
      paintStars(ctx, width, horizonY, time, scale);
      paintSun(ctx, width * 0.5, horizonY, sunRadius, scale);
      paintMountains(ctx, width, height, horizonY);
      paintFloor(ctx, width, height, horizonY);
      paintHorizon(ctx, width, horizonY, scale);
      paintGrid(ctx, width, height, horizonY, time, scale);
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
      if (!measure()) return;
      draw(motion.matches ? 0.4 : (performance.now() - started) / 1000);
      wake();
    };

    const onMotion = () => {
      if (motion.matches) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        draw(0.4);
        return;
      }
      wake();
    };

    const onVisibility = () => {
      if (!document.hidden) wake();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);
    const lede = parent.querySelector(".lede");
    if (lede) resizeObserver.observe(lede);
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

  return <canvas ref={canvasRef} className="contact-field" aria-hidden="true" />;
}
