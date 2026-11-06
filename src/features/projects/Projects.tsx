import { useLayoutEffect, useRef } from "react";
import SynthwaveSheen from "../../components/common/SynthwaveSheen";
import ProjectTrails from "./ProjectTrails";
import {
  documentTop,
  readChrome,
  stableViewport,
  syncViewport,
} from "../../utils/viewport";
import {
  PROJECTS_SETTLE,
  PROJECTS_SLIDE,
  projectShift,
  projectsCover,
  stuckTop,
} from "./scroll";

type MarkName = "portal" | "cluster";

type Project = {
  id: string;
  kind: "work" | "personal";
  title: string;
  text?: string;
  href?: string;
  mark?: MarkName;
};

const PROJECTS: Project[] = [
  {
    id: "portal",
    kind: "work",
    title: "Developer portal",
    mark: "portal",
  },
  {
    id: "workflows",
    kind: "work",
    title: "Workflow automation",
    text: "Automated workflows for more than 200 engineering teams.",
  },
  {
    id: "openshift",
    kind: "work",
    title: "OpenShift applications",
    mark: "cluster",
  },
  {
    id: "delivery",
    kind: "work",
    title: "Figma to deployment",
    text: "Features taken from design through to the cluster.",
  },
  {
    id: "site",
    kind: "personal",
    title: "This site",
    text: "The page you're on.",
    href: "https://jordanlewin.ca",
  },
];

const KIND_LABEL = {
  work: "Professional",
  personal: "Personal",
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function dockLocal(width: number, viewW: number, focusRatio: number) {
  const start = -width - 40;
  const end = viewW + 40;
  return (viewW * focusRatio - width / 2 - start) / Math.max(1, end - start);
}

const scrollPass = CSS.supports("animation-timeline", "scroll()");

function passFrames(
  index: number,
  count: number,
  width: number,
  viewW: number,
) {
  const n = Math.max(1, count);
  const slide = Math.min(PROJECTS_SLIDE, 0.5 / (n + 1));
  const hold = (1 - (n + 1) * slide) / n;
  const marks = new Set<number>([0, 1]);
  for (let i = 0; i < n; i++) {
    const holdStart = slide + i * (hold + slide);
    const holdEnd = holdStart + hold;
    for (let step = 0; step <= 4; step++) {
      marks.add(holdStart - slide + (slide * step) / 4);
      marks.add(holdEnd + (slide * step) / 4);
    }
  }

  const frames: Array<{ pct: number; x: number }> = [];
  for (const progress of [...marks].sort((a, b) => a - b)) {
    const t = clamp(progress, 0, 1);
    const pct = Math.round(t * 10000) / 100;
    const local = projectShift(t, index, count, dockLocal(width, viewW, 0.5));
    const x = Math.round(lerp(-width - 40, viewW + 40, local));
    const prev = frames[frames.length - 1];
    if (prev && prev.pct === pct) {
      prev.x = x;
      continue;
    }
    frames.push({ pct, x });
  }

  return frames
    .map((frame) => `${frame.pct}%{transform:translate3d(${frame.x}px,-50%,0)}`)
    .join("");
}

function hostLabel(href: string) {
  return new URL(href).host.replace(/^www\./, "");
}

function variantOf(project: Project) {
  if (project.href) return "link";
  if (project.mark && !project.text) return "icon";
  return "text";
}

function Mark({ name }: { name: MarkName }) {
  if (name === "cluster") {
    return (
      <svg className="project-mark" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="14" r="5" />
        <circle cx="14" cy="48" r="5" />
        <circle cx="50" cy="48" r="5" />
        <path d="M28.4 17.8 17.2 43.2M35.6 17.8 46.8 43.2M19 48h26" />
      </svg>
    );
  }

  return (
    <svg className="project-mark" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="8" y="12" width="48" height="40" rx="6" />
      <path d="M8 24h48M24 24v28" />
    </svg>
  );
}

function Go({ href }: { href: string }) {
  return (
    <a className="project-go" href={href}>
      <span className="project-go-border">
        <span className="project-go-face">
          <SynthwaveSheen className="project-go-sheen" />
          <span className="project-go-label">Go</span>
        </span>
      </span>
    </a>
  );
}

function Face({ project }: { project: Project }) {
  const kind = KIND_LABEL[project.kind];
  const variant = variantOf(project);

  if (variant === "icon" && project.mark) {
    return (
      <div className="project-face">
        <Mark name={project.mark} />
        <span className="project-caption">
          <span className="project-kind">{kind}</span>
          <span className="project-caption-title">{project.title}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="project-face">
      <p className="project-kind">{kind}</p>
      <h3>{project.title}</h3>
      {project.text ? <p className="project-text">{project.text}</p> : null}
      {project.href ? (
        <div className="project-link">
          <span className="project-url">{hostLabel(project.href)}</span>
          <Go href={project.href} />
        </div>
      ) : null}
    </div>
  );
}

export default function Projects() {
  const pinRef = useRef<HTMLDivElement>(null);
  const roadRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLLIElement | null>>([]);

  useLayoutEffect(() => {
    const pin = pinRef.current;
    const road = roadRef.current;
    if (!pin || !road) return;

    let lastKey = "";
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stage = pin.querySelector<HTMLElement>(".projects-stage");
    const lane = pin.querySelector<HTMLElement>(".projects-lane");
    const passStyle = scrollPass ? document.createElement("style") : null;
    if (passStyle) document.head.appendChild(passStyle);
    let pinDoc = 0;
    let stageDoc = 0;
    let pinHeight = 1;
    let stageHeight = 1;
    let viewW = 1;
    let widths: number[] = [];

    const measure = () => {
      syncViewport();
      const cards = cardRefs.current.filter(
        (card): card is HTMLLIElement => card !== null,
      );
      pinDoc = documentTop(pin);
      stageDoc = stage ? documentTop(stage) : pinDoc;
      pinHeight = pin.offsetHeight;
      const { height: viewH } = stableViewport();
      const sticky = readChrome().sticky;
      stageHeight = Math.max(1, viewH - sticky);
      viewW = road.clientWidth;
      widths = cards.map((card) => card.offsetWidth);
      lastKey = "";

      if (
        !passStyle ||
        !lane ||
        motion.matches ||
        viewW < 1 ||
        !widths.length
      ) {
        lane?.classList.remove("is-scroll-pass");
        lane?.style.removeProperty("--pass-start");
        lane?.style.removeProperty("--pass-end");
        return;
      }

      const release = Math.max(1, pinHeight - stageHeight);
      const travel = Math.max(1, release - viewH * PROJECTS_SETTLE);
      const passStart = Math.max(0, Math.round(pinDoc - sticky));
      lane.style.setProperty("--pass-start", `${passStart}px`);
      lane.style.setProperty(
        "--pass-end",
        `${Math.round(passStart + travel)}px`,
      );
      lane.classList.add("is-scroll-pass");
      passStyle.textContent = widths
        .map((width, index) => {
          const frames = passFrames(index, widths.length, width, viewW);
          return `@keyframes project-pass-${index}{${frames}}.projects-lane.is-scroll-pass .project-card:nth-child(${index + 1}){animation-name:project-pass-${index}}`;
        })
        .join("");
      cards.forEach((card) => {
        card.style.transform = "";
      });
    };

    const apply = () => {
      const cards = cardRefs.current.filter(
        (card): card is HTMLLIElement => card !== null,
      );
      if (!cards.length || viewW < 1 || widths.length !== cards.length) return;

      const { height: viewH } = stableViewport();
      const sticky = readChrome().sticky;
      if (motion.matches) {
        if (lastKey === "reduced") return;
        lastKey = "reduced";
        if (stage) {
          stage.style.opacity = "";
          stage.style.pointerEvents = "";
        }
        cards.forEach((card) => {
          card.style.transform = "";
          card.style.pointerEvents = "";
          card.classList.remove("is-hot");
          const link = card.querySelector("a");
          if (link) link.tabIndex = 0;
        });
        return;
      }

      const pinTop = pinDoc - window.scrollY;
      const release = Math.max(1, pinHeight - stageHeight);
      const travel = Math.max(1, release - viewH * PROJECTS_SETTLE);
      const progress = clamp((sticky - pinTop) / travel, 0, 1);
      const cover = stage
        ? projectsCover(
            stuckTop(
              stageDoc - window.scrollY,
              pinTop,
              pinHeight,
              stageHeight,
              sticky,
            ),
            viewH,
          )
        : 1;
      const key = `${progress.toFixed(4)}:${cover.toFixed(3)}:${viewW}`;
      if (key === lastKey) return;
      lastKey = key;

      if (stage) {
        stage.style.opacity = cover.toFixed(3);
        stage.style.pointerEvents = cover < 0.15 ? "none" : "";
      }

      const focusRatio = 0.5;
      const focus = viewW * focusRatio;
      let hot = -1;
      let hotDist = Infinity;

      cards.forEach((card, index) => {
        const width = widths[index];
        const local = projectShift(
          progress,
          index,
          cards.length,
          dockLocal(width, viewW, focusRatio),
        );
        const x = Math.round(lerp(-width - 40, viewW + 40, local));
        if (!lane?.classList.contains("is-scroll-pass")) {
          card.style.transform = `translate3d(${x}px, -50%, 0)`;
        }
        const center = x + width / 2;
        const onStage = center > 24 && center < viewW - 24;
        card.style.pointerEvents = onStage ? "auto" : "none";
        const link = card.querySelector("a");
        if (link) link.tabIndex = onStage ? 0 : -1;
        if (!onStage) return;
        const dist = Math.abs(center - focus);
        if (dist < hotDist) {
          hotDist = dist;
          hot = index;
        }
      });

      cards.forEach((card, index) => {
        card.classList.toggle("is-hot", index === hot);
      });
    };

    const onResize = () => {
      syncViewport();
      measure();
      apply();
    };

    const onMotion = () => {
      lastKey = "";
      measure();
      apply();
    };

    measure();
    apply();
    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", onResize);
    motion.addEventListener("change", onMotion);

    return () => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", onResize);
      motion.removeEventListener("change", onMotion);
      lane?.classList.remove("is-scroll-pass");
      passStyle?.remove();
    };
  }, []);

  return (
    <section
      id="projects"
      className="section section-projects"
      aria-labelledby="projects-title"
    >
      <div className="projects-pin" ref={pinRef}>
        <div className="projects-stage">
          <div className="projects-intro">
            <p className="eyebrow">Projects</p>
            <h2 id="projects-title">Things I've Done</h2>
            <p className="lede">Professional work, and a personal project.</p>
          </div>
          <div className="projects-road" ref={roadRef}>
            <ProjectTrails />
            <ol className="projects-lane">
              {PROJECTS.map((project, index) => (
                <li
                  key={project.id}
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  className={
                    index % 2
                      ? `project-card is-${variantOf(project)} is-${project.kind} is-alt`
                      : `project-card is-${variantOf(project)} is-${project.kind}`
                  }
                  aria-label={
                    variantOf(project) === "icon"
                      ? `${project.title}, ${KIND_LABEL[project.kind]}`
                      : undefined
                  }
                >
                  <Face project={project} />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
