import { useLayoutEffect, useRef } from "react";
import SynthwaveSheen from "../../components/common/SynthwaveSheen";
import ProjectFibers from "./ProjectFibers";
import { PROJECTS_SETTLE, PROJECTS_STICKY, projectShift } from "./scroll";

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

    let frame = 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const apply = () => {
      frame = 0;
      const cards = cardRefs.current.filter(
        (card): card is HTMLLIElement => card !== null,
      );
      if (!cards.length || road.clientWidth < 1) return;

      if (motion.matches) {
        cards.forEach((card) => {
          card.style.transform = "";
          card.style.pointerEvents = "";
          card.classList.remove("is-hot");
          const link = card.querySelector("a");
          if (link) link.tabIndex = 0;
        });
        return;
      }

      const release = Math.max(
        1,
        pin.offsetHeight - (window.innerHeight - PROJECTS_STICKY),
      );
      const travel = Math.max(
        1,
        release - window.innerHeight * PROJECTS_SETTLE,
      );
      const progress = clamp(
        (PROJECTS_STICKY - pin.getBoundingClientRect().top) / travel,
        0,
        1,
      );
      const viewW = road.clientWidth;
      const focusRatio = 0.5;
      const focus = viewW * focusRatio;
      let hot = -1;
      let hotDist = Infinity;

      cards.forEach((card, index) => {
        const width = card.offsetWidth;
        const local = projectShift(
          progress,
          index,
          cards.length,
          dockLocal(width, viewW, focusRatio),
        );
        const x = Math.round(lerp(-width - 40, viewW + 40, local));
        card.style.transform = `translate3d(${x}px, -50%, 0)`;
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

    const requestApply = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", requestApply, { passive: true });
    window.addEventListener("resize", requestApply);
    motion.addEventListener("change", requestApply);

    return () => {
      window.removeEventListener("scroll", requestApply);
      window.removeEventListener("resize", requestApply);
      motion.removeEventListener("change", requestApply);
      if (frame) cancelAnimationFrame(frame);
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
            <ProjectFibers />
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
