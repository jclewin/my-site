import { useLayoutEffect, useRef } from "react";
import Header from "../../components/layout/Header";
import Logo from "../../components/layout/Logo";
import Contact from "../../features/contact";
import ProfilePortrait from "../../features/profile";
import ProfileSky from "../../features/profile/ProfileSky";
import Projects, { projectsEntryTop } from "../../features/projects";
import Skills from "../../features/skills";
import {
  documentTop,
  isStacked,
  readChrome,
  stableViewport,
  syncViewport,
} from "../../utils/viewport";

const END_STROKE = 9;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function smoothstep(t: number) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function Home() {
  const logoRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const logo = logoRef.current;
    const nav = navRef.current;
    if (!logo || !nav) return;

    let frame = 0;
    let hintPlaying = true;
    let lastRaw = "";
    let lastRule = "";
    let currentId = "";
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const links = [
      ...nav.querySelectorAll<HTMLAnchorElement>("a[href^='#']"),
    ];
    let sectionTops: Array<{ id: string; top: number }> = [];

    const measureSections = () => {
      sectionTops = [];
      links.forEach((link) => {
        const id = link.getAttribute("href")?.slice(1);
        const section = id ? document.getElementById(id) : null;
        if (id && section) sectionTops.push({ id, top: documentTop(section) });
      });
    };

    const apply = () => {
      frame = 0;
      const { width: viewW, height: viewH } = stableViewport();
      const { nav: navH, sticky, safeTop } = readChrome();
      const heroStroke = Math.min(viewH / 5, viewW / 7);
      const heroJ = Math.max(0, (viewW - 5 * heroStroke) / 2);
      const heroL = heroJ + heroStroke;
      let endStroke = Math.min(END_STROKE, Math.floor((viewW - 16) / 11));
      if (viewW <= 760) endStroke = Math.min(endStroke, viewW <= 380 ? 6 : 7);
      if (viewH <= 520) endStroke = Math.min(endStroke, 6);
      const endW = endStroke * 11;
      const endH = endStroke * 5;
      const range = Math.max(viewH * 0.65, 280);
      const reduced = motionQuery.matches;
      const raw = reduced
        ? window.scrollY > 8
          ? 1
          : 0
        : clamp(window.scrollY / range, 0, 1);
      const rawKey = raw.toFixed(4);
      const t = smoothstep(raw);
      const navT = smoothstep(clamp((raw - 0.22) / 0.78, 0, 1));
      const ruleT = reduced
        ? raw
        : smoothstep(clamp((window.scrollY - range) / 120, 0, 1));
      const ruleKey = ruleT.toFixed(4);

      if (rawKey !== lastRaw) {
        lastRaw = rawKey;
        const x = lerp(0, (viewW - endW) / 2, t);
        const band = Math.max(endH, navH - safeTop);
        const y = lerp(0, safeTop + (band - endH) / 2, t);
        const width = Math.round(lerp(viewW, endW, t));
        const height = Math.round(lerp(viewH, endH, t));
        const stroke = Math.max(1, Math.round(lerp(heroStroke, endStroke, t)));
        const jFlex = Math.round(lerp(heroJ, endStroke * 3, t));
        let lFlex = Math.round(lerp(heroL, endStroke * 4, t));
        lFlex += width - (stroke * 4 + jFlex + lFlex);
        const mid = Math.max(stroke * 2, height - stroke * 3);

        logo.style.width = `${width}px`;
        logo.style.height = `${height}px`;
        logo.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
        logo.style.setProperty("--stroke", `${stroke}px`);
        logo.style.setProperty("--mid", `${mid}px`);
        logo.style.setProperty("--j-flex", `${jFlex}px`);
        logo.style.setProperty("--l-flex", `${Math.max(0, lFlex)}px`);

        nav.style.opacity = String(navT);
        nav.style.transform = `translate3d(0, ${(1 - navT) * -100}%, 0)`;
        nav.style.pointerEvents = navT > 0.45 ? "auto" : "none";
        nav.inert = navT < 0.45;
        document.documentElement.style.setProperty("--scroll", rawKey);

        const hint = hintRef.current;
        if (hint) {
          const playing = raw < 0.36;
          if (playing !== hintPlaying) {
            hintPlaying = playing;
            hint.classList.toggle("is-paused", !playing);
          }
        }
      }

      if (ruleKey !== lastRule) {
        lastRule = ruleKey;
        nav.style.setProperty("--rule", ruleKey);
      }

      const line = window.scrollY + sticky;
      let nextId = "";
      if (window.scrollY > 24) {
        sectionTops.forEach((section) => {
          if (section.top <= line) nextId = section.id;
        });
      }
      if (nextId !== currentId) {
        currentId = nextId;
        links.forEach((link) => {
          const id = link.getAttribute("href")?.slice(1);
          if (id && id === currentId) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
      }
    };

    const requestApply = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    const onResize = () => {
      syncViewport();
      lastRaw = "";
      lastRule = "";
      measureSections();
      apply();
    };

    measureSections();
    apply();
    window.addEventListener("scroll", requestApply, { passive: true });
    window.addEventListener("resize", onResize);
    motionQuery.addEventListener("change", onResize);

    return () => {
      window.removeEventListener("scroll", requestApply);
      window.removeEventListener("resize", onResize);
      motionQuery.removeEventListener("change", onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const goToProfile = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const hold = document.querySelector<HTMLElement>(".profile-hold");
    if (!hold) return;
    event.preventDefault();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const stacked = isStacked();
    const imageTop = readChrome().frameTop;
    const frame = document.querySelector<HTMLElement>(".profile-frame");
    const meet = stacked ? imageTop + (frame?.offsetHeight ?? 0) + 28 : imageTop;
    const docTop = documentTop(hold);
    history.pushState(null, "", "#profile");
    window.scrollTo({
      top: Math.max(0, Math.ceil(docTop - meet)),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  const goToSkills = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const pin = document.querySelector<HTMLElement>(".skills-pin");
    if (!pin) return;
    event.preventDefault();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const stickyTop = readChrome().sticky;
    const viewH = stableViewport().height;
    const pinTop = pin.getBoundingClientRect().top + window.scrollY;
    let top = pinTop - stickyTop;
    if (!reduced && !isStacked()) {
      const releaseTravel = Math.max(1, pin.offsetHeight - (viewH - stickyTop));
      const travel = Math.max(1, releaseTravel - viewH * 0.35);
      top = pinTop - stickyTop + travel;
    }
    history.pushState(null, "", "#skills");
    window.scrollTo({
      top: Math.max(0, Math.ceil(top)),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  const goToProjects = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const pin = document.querySelector<HTMLElement>(".projects-pin");
    if (!pin) return;
    event.preventDefault();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    history.pushState(null, "", "#projects");
    window.scrollTo({
      top: Math.max(0, Math.ceil(projectsEntryTop(pin, reduced))),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  const goHome = () => {
    if (location.hash) {
      history.pushState(null, "", `${location.pathname}${location.search}`);
    }
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <>
      <Header
        navRef={navRef}
        onProfileClick={goToProfile}
        onSkillsClick={goToSkills}
        onProjectsClick={goToProjects}
      />

      <Logo logoRef={logoRef} onHome={goHome} />

      <p className="scroll-hint" ref={hintRef}>
        <span>Scroll</span>
        <span className="scroll-chevron" aria-hidden="true" />
      </p>

      <main>
        <div className="hero" id="home" />

        <section id="profile" className="profile-pin">
          <ProfileSky />
          <div className="profile-stage">
            <div className="profile-slot">
              <ProfilePortrait />
            </div>
            <div className="profile-hold">
              <div className="profile-copy">
                <p className="eyebrow">Profile</p>
                <h2>Jordan Lewin</h2>
                <p className="profile-role">
                  Full-stack developer and technical lead
                </p>
                <p className="lede">
                  Six years building microservices and internal developer
                  portals. I treat every change as part of a wider web of
                  services, teams, and workflows, and I look for the side
                  effects before they spread.
                </p>
                <p className="lede">
                  At TELUS I led full-stack teams shipping OpenShift
                  applications, automated workflows for more than 200
                  engineering teams, and took features from Figma through to
                  deployment.
                </p>
              </div>
              <div className="profile-spacer" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section id="skills" className="section section-skills">
          <Skills />
        </section>

        <Projects />

        <Contact />
      </main>
    </>
  );
}

export default Home;
