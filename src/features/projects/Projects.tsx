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

type BadgeName = "gift";

type Project = {
  id: string;
  kind: "work" | "personal";
  title: string;
  text: string;
  place?: string;
  stack?: string[];
  href?: string;
  badge?: BadgeName;
};

const PROJECTS: Project[] = [
  {
    id: "inbox",
    kind: "work",
    place: "S&T Properties",
    title: "Guest inbox",
    text: "One inbox for Airbnb, VRBO, and Booking.com. Messages arrive live, with the booking, the unit, and open tickets beside the thread.",
    stack: ["React", "TypeScript", "GraphQL"],
  },
  {
    id: "automation",
    kind: "work",
    place: "S&T Properties",
    title: "Message automation",
    text: "A unit's details write its guest messages. A three-step wizard previews the chat and fills in names, dates, and stay info.",
    stack: ["React", "TypeScript", "Figma"],
  },
  {
    id: "portals",
    kind: "work",
    place: "TELUS",
    title: "Engineering portals",
    text: "Ten portals for 200+ teams planning the core network. Taken from Figma onto OpenShift, with a shared release log for what shipped.",
    stack: ["React", "Node.js", "OpenShift"],
  },
  {
    id: "docs",
    kind: "work",
    place: "TELUS",
    title: "Portal docs",
    text: "Guides and API references that publish themselves. Onboarding a repo wires its docs into the site.",
    stack: ["Docusaurus", "Node.js"],
  },
  {
    id: "wishlist",
    kind: "personal",
    title: "Wishlist It",
    text: "Shared lists where a reserved gift stays a surprise. Live updates, link previews, and a reminder before the day.",
    stack: ["React", "Fastify", "Postgres"],
    href: "https://wishlist-it.app",
    badge: "gift",
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

function handPlaced(viewW: number) {
  return viewW <= 760 || window.matchMedia("(pointer: coarse)").matches;
}

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
  return project.href ? "link" : "text";
}

function Badge({ name }: { name: BadgeName }) {
  if (name !== "gift") return null;

  return (
    <svg
      className="project-badge"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 7v14" />
      <path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" />
      <path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5" />
      <rect x="3" y="7" width="18" height="4" rx="1" />
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

  return (
    <div className="project-face">
      {project.badge ? <Badge name={project.badge} /> : null}
      <p className="project-kind">
        {project.place ? (
          <>
            {kind}
            <span className="project-place">{project.place}</span>
          </>
        ) : (
          kind
        )}
      </p>
      <h3>{project.title}</h3>
      <p className="project-text">{project.text}</p>
      {project.stack?.length ? (
        <p className="project-stack">{project.stack.join(" · ")}</p>
      ) : null}
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
      // offsetTop on the sticky stage follows the stuck box, so a
      // measure taken mid-scroll makes the stage fade out on the way up.
      stageDoc = pinDoc;
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
        handPlaced(viewW) ||
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
            <p className="lede">Professional work, and personal projects.</p>
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
