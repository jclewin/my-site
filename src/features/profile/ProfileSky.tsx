import { useEffect, useRef } from "react";
import { projectsCover, stuckTop } from "../projects/scroll";
import {
  documentTop,
  pixelRatio,
  readChrome,
  stableViewport,
  syncViewport,
} from "../../utils/viewport";

const YELLOW = "#ffd319";
const PINK = "#ff76ff";
const PURPLE = "#540d6e";
const NAV_CLEAR = 96;
const BLEND_MS = 900;
const RINGS = [0.46, 0.74, 1];

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

const STARS = Array.from({ length: 36 }, (_, index) => ({
  x: hash(index + 1),
  y: hash(index + 12) * 0.55,
  size: 0.7 + hash(index + 24) * 1.2,
  phase: hash(index + 36) * Math.PI * 2,
}));

const BLIPS = Array.from({ length: 4 }, (_, index) => ({
  ring: index % RINGS.length,
  angle: hash(index + 4) * Math.PI * 2,
  gold: index % 3 === 0,
}));

export default function ProfileSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const skills = document.getElementById("skills");
    const projects = document.getElementById("projects");
    const stage =
      projects?.querySelector<HTMLElement>(".projects-stage") ?? null;
    const pin = stage?.parentElement ?? null;
    const started = performance.now();
    const anchor = { x: 0, y: 0, radius: 1 };
    let frame = 0;
    let alive = true;
    let shown = false;
    let blend = 0;
    let blendFrom = 0;
    let blendTo = 0;
    let blendStart = 0;

    const place = () => {
      syncViewport();
      const portrait = parent.querySelector<HTMLElement>(".profile-frame");
      const { frameTop, faceDrop } = readChrome();
      const top = frameTop - faceDrop;
      const width = portrait?.offsetWidth || stableViewport().width * 0.28;
      const height = portrait?.offsetHeight || width * (638 / 475);
      const left = portrait?.style.left
        ? parseFloat(portrait.style.left)
        : portrait
          ? portrait.getBoundingClientRect().left
          : window.innerWidth * 0.08;
      const radius = width * 0.78;
      const fixed = portrait
        ? getComputedStyle(portrait).position === "fixed"
        : false;
      anchor.radius = radius;
      anchor.x = Math.round(left + width / 2);
      anchor.y = Math.round(
        Math.max(top + height * 0.42, NAV_CLEAR + radius) +
          (fixed ? faceDrop : 0),
      );
    };

    const draw = (time: number) => {
      const cssWidth = parent.clientWidth;
      const cssHeight = canvas.clientHeight;
      if (cssWidth < 2 || cssHeight < 2) return;

      const dpr = pixelRatio("canvas");
      const width = Math.max(1, Math.round(cssWidth * dpr));
      const height = Math.max(1, Math.round(cssHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const scale = width / cssWidth;
      const cx = anchor.x * scale;
      const cy = anchor.y * scale;
      const radius = anchor.radius * scale;
      const sun = 1 - blend;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#111113";
      ctx.fillRect(0, 0, width, height);

      if (sun > 0.01) {
        const sky = ctx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, `rgba(20, 8, 36, ${0.55 * sun})`);
        sky.addColorStop(0.45, `rgba(84, 13, 110, ${0.18 * sun})`);
        sky.addColorStop(1, "rgba(17, 17, 19, 0)");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        for (const star of STARS) {
          const twinkle =
            0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 1.1 + star.phase));
          const x = star.x * width * 0.72;
          const y = star.y * height * 0.7;
          if (Math.hypot(x - cx, y - cy) < radius * 0.85) continue;
          ctx.fillStyle = `rgba(244, 244, 245, ${0.45 * twinkle * sun})`;
          const size = Math.max(1, star.size * scale);
          ctx.fillRect(x, y, size, size);
        }
      }

      const bloom = ctx.createRadialGradient(
        cx,
        cy,
        radius * 0.2,
        cx,
        cy,
        radius * 1.85,
      );
      bloom.addColorStop(0, `rgba(255, 211, 25, ${0.28 * sun})`);
      bloom.addColorStop(
        0.28,
        `rgba(255, 118, 255, ${0.2 * sun + 0.05 * blend})`,
      );
      bloom.addColorStop(0.55, `rgba(84, 13, 110, ${0.16})`);
      bloom.addColorStop(0.78, `rgba(45, 226, 230, ${0.08 * blend})`);
      bloom.addColorStop(1, "rgba(17, 17, 19, 0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, width, height);

      if (sun > 0.01) {
        ctx.save();
        ctx.globalAlpha = sun;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        const disc = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
        disc.addColorStop(0, YELLOW);
        disc.addColorStop(0.42, PINK);
        disc.addColorStop(0.78, PURPLE);
        disc.addColorStop(1, "#1a1024");
        ctx.fillStyle = disc;
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
        ctx.fillStyle = "rgba(17, 17, 19, 0.38)";
        const stripe = Math.max(4, 11 * scale);
        for (let y = cy - radius; y < cy + radius; y += stripe) {
          ctx.fillRect(cx - radius, y, radius * 2, stripe * 0.34);
        }
        ctx.restore();
      }

      if (blend > 0.01) {
        ctx.save();
        ctx.globalAlpha = blend;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.lineCap = "round";
        RINGS.forEach((ring, index) => {
          ctx.strokeStyle =
            index === 1
              ? "rgba(255, 118, 255, 0.32)"
              : "rgba(45, 226, 230, 0.28)";
          ctx.lineWidth = 1.1 * scale;
          ctx.beginPath();
          ctx.arc(cx, cy, radius * ring, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.translate(cx, cy);
        ctx.rotate(time * 0.22);
        ctx.strokeStyle = "rgba(45, 226, 230, 0.45)";
        ctx.lineWidth = 1.4 * scale;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius, 0);
        ctx.stroke();
        ctx.rotate(-time * 0.22);
        for (const blip of BLIPS) {
          const angle = blip.angle + time * 0.08;
          const dist = radius * RINGS[blip.ring];
          ctx.fillStyle = blip.gold
            ? "rgba(255, 211, 25, 0.95)"
            : "rgba(45, 226, 230, 0.95)";
          ctx.beginPath();
          ctx.arc(
            Math.cos(angle) * dist,
            Math.sin(angle) * dist,
            2.4 * scale,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.globalAlpha = 1;
      const compact = cssWidth < 760;
      const shade = compact
        ? ctx.createLinearGradient(0, cy + radius * 0.35, 0, height)
        : ctx.createLinearGradient(cx + radius * 0.15, 0, width, 0);
      shade.addColorStop(0, "rgba(17, 17, 19, 0)");
      shade.addColorStop(0.5, "rgba(17, 17, 19, 0.72)");
      shade.addColorStop(1, "rgba(17, 17, 19, 0.94)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, height);
    };

    const aim = (next: number) => {
      if (blendTo === next) return;
      blendFrom = blend;
      blendTo = next;
      blendStart = performance.now();
      if (motion.matches) blend = next;
    };

    const tick = (now: number) => {
      frame = 0;
      if (!alive || document.hidden) return;
      if (!motion.matches && blend !== blendTo) {
        const t = smoothstep((now - blendStart) / BLEND_MS);
        blend = blendFrom + (blendTo - blendFrom) * t;
        if (t === 1) blend = blendTo;
      }
      draw((now - started) / 1000);
      if (!motion.matches && (shown || blend !== blendTo)) {
        frame = requestAnimationFrame(tick);
      }
    };

    const wake = () => {
      if (!frame && alive && !document.hidden)
        frame = requestAnimationFrame(tick);
    };

    let handoffClear = 0;
    let profileDoc = 0;
    let profileHeight = 0;
    let skillsDoc = 0;
    let skillsHeight = 0;
    let stageDoc = 0;
    let pinDoc = 0;
    let pinHeight = 0;
    let stageHeight = 1;

    const measureScene = () => {
      syncViewport();
      const { height: viewH } = stableViewport();
      const sticky = readChrome().sticky;
      profileDoc = documentTop(parent);
      profileHeight = parent.offsetHeight;
      skillsDoc = skills ? documentTop(skills) : 0;
      skillsHeight = skills?.offsetHeight ?? 0;
      stageDoc = stage ? documentTop(stage) : 0;
      pinDoc = pin ? documentTop(pin) : stageDoc;
      pinHeight = pin?.offsetHeight ?? 0;
      stageHeight = Math.max(1, viewH - sticky);
    };

    const updatePresence = () => {
      const { height: viewH } = stableViewport();
      const sticky = readChrome().sticky;
      const mid = viewH * 0.5;
      const scrollY = window.scrollY;
      const profileTop = profileDoc - scrollY;
      const profileBottom = profileTop + profileHeight;
      const skillsTop = skills ? skillsDoc - scrollY : viewH + 1;
      const skillsBottom = skillsTop + skillsHeight;
      const pinTop = pinDoc - scrollY;
      const stageTop = stage
        ? stuckTop(stageDoc - scrollY, pinTop, pinHeight, stageHeight, sticky)
        : viewH + 1;
      const cover =
        !stage || motion.matches ? 0 : projectsCover(stageTop, viewH);
      const skillsOn =
        !!skills && skillsTop < mid - 24 && skillsBottom > mid + 24;
      const profileOn = profileTop < mid - 24 && profileBottom > mid + 24;
      const near =
        (!!skills && skillsBottom > 0 && skillsTop < viewH) ||
        (profileBottom > 0 && profileTop < viewH);

      if (cover > 0.001) {
        if (handoffClear) cancelAnimationFrame(handoffClear);
        handoffClear = 0;
        canvas.classList.add("is-handoff");
        shown = near && cover < 0.999;
        canvas.classList.toggle("is-in", shown);
        canvas.style.opacity = near ? (1 - cover).toFixed(3) : "0";
      } else if (canvas.classList.contains("is-handoff")) {
        shown = near;
        canvas.classList.toggle("is-in", shown);
        canvas.style.opacity = shown ? "1" : "0";
        if (handoffClear) cancelAnimationFrame(handoffClear);
        handoffClear = requestAnimationFrame(() => {
          handoffClear = 0;
          const { height: viewHNow } = stableViewport();
          const stickyNow = readChrome().sticky;
          const top = stage
            ? stuckTop(
                stageDoc - window.scrollY,
                pinDoc - window.scrollY,
                pinHeight,
                stageHeight,
                stickyNow,
              )
            : viewHNow + 1;
          if (projectsCover(top, viewHNow) > 0.001) return;
          canvas.classList.remove("is-handoff");
          canvas.style.removeProperty("opacity");
        });
      } else {
        shown = skillsOn || profileOn;
        canvas.classList.toggle("is-in", shown);
        canvas.style.removeProperty("opacity");
      }

      const pastSkills = !!skills && skillsBottom < mid + 24;
      if (pastSkills && !profileOn) {
        blend = 1;
        blendFrom = 1;
        blendTo = 1;
      } else {
        aim(skillsOn ? 1 : 0);
      }
      if (shown || blend !== blendTo) wake();
    };

    const paint = () => {
      measureScene();
      place();
      draw(motion.matches ? 1.2 : (performance.now() - started) / 1000);
      updatePresence();
      wake();
    };

    const onMotion = () => {
      updatePresence();
      if (motion.matches) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        blend = blendTo;
        draw(1.2);
        return;
      }
      wake();
    };

    const resizeObserver = new ResizeObserver(paint);
    resizeObserver.observe(parent);
    const portrait = parent.querySelector(".profile-frame");
    if (portrait) resizeObserver.observe(portrait);
    const onVisibility = () => {
      if (!document.hidden) wake();
    };

    motion.addEventListener("change", onMotion);
    window.addEventListener("resize", paint);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", updatePresence, { passive: true });
    paint();
    updatePresence();

    return () => {
      alive = false;
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      motion.removeEventListener("change", onMotion);
      window.removeEventListener("resize", paint);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", updatePresence);
      if (handoffClear) cancelAnimationFrame(handoffClear);
    };
  }, []);

  return <canvas ref={canvasRef} className="profile-sky" aria-hidden="true" />;
}
