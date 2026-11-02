import { useEffect, useRef } from "react";
import Header from "../../components/layout/Header";
import Logo from "../../components/layout/Logo";
import Contact from "../../features/contact";
import ProfilePortrait from "../../features/profile";
import Projects from "../../features/projects";
import Skills from "../../features/skills";

const NAV_HEIGHT = 76;
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

  useEffect(() => {
    const logo = logoRef.current;
    const nav = navRef.current;
    if (!logo || !nav) return;

    let frame = 0;
    let hintPlaying = true;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const apply = () => {
      frame = 0;
      const viewW = document.documentElement.clientWidth;
      const viewH = window.innerHeight;
      const heroStroke = Math.min(viewH / 5, viewW / 5);
      const heroJ = Math.max(0, (viewW - 5 * heroStroke) / 2);
      const heroL = heroJ + heroStroke;
      const endStroke = Math.min(END_STROKE, Math.floor((viewW - 16) / 11));
      const endW = endStroke * 11;
      const endH = endStroke * 5;
      const range = Math.max(viewH * 0.65, 280);
      const reduced = motionQuery.matches;
      const raw = reduced
        ? window.scrollY > 8
          ? 1
          : 0
        : clamp(window.scrollY / range, 0, 1);
      const t = smoothstep(raw);
      const navT = smoothstep(clamp((raw - 0.22) / 0.78, 0, 1));
      const x = lerp(0, (viewW - endW) / 2, t);
      const y = lerp(0, (NAV_HEIGHT - endH) / 2, t);
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

      const ruleT = reduced
        ? raw
        : smoothstep(clamp((window.scrollY - range) / 120, 0, 1));

      nav.style.opacity = String(navT);
      nav.style.transform = `translate3d(0, ${(1 - navT) * -100}%, 0)`;
      nav.style.pointerEvents = navT > 0.45 ? "auto" : "none";
      nav.inert = navT < 0.45;
      nav.style.setProperty("--rule", ruleT.toFixed(4));
      document.documentElement.style.setProperty("--scroll", raw.toFixed(4));

      const hint = hintRef.current;
      if (hint) {
        const playing = raw < 0.36;
        if (playing !== hintPlaying) {
          hintPlaying = playing;
          hint.classList.toggle("is-paused", !playing);
        }
      }

      const marker = NAV_HEIGHT + 56;
      let currentId = "";
      if (window.scrollY > 24) {
        nav
          .querySelectorAll<HTMLAnchorElement>("a[href^='#']")
          .forEach((link) => {
            const id = link.getAttribute("href")?.slice(1);
            const section = id ? document.getElementById(id) : null;
            if (section && section.getBoundingClientRect().top <= marker) {
              currentId = id ?? "";
            }
          });
      }
      nav
        .querySelectorAll<HTMLAnchorElement>("a[href^='#']")
        .forEach((link) => {
          const id = link.getAttribute("href")?.slice(1);
          if (id && id === currentId) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
    };

    const requestApply = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", requestApply, { passive: true });
    window.addEventListener("resize", requestApply);
    motionQuery.addEventListener("change", requestApply);

    return () => {
      window.removeEventListener("scroll", requestApply);
      window.removeEventListener("resize", requestApply);
      motionQuery.removeEventListener("change", requestApply);
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
    const copy = document.querySelector<HTMLElement>(".profile-copy");
    if (!copy) return;
    event.preventDefault();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const narrow = window.matchMedia("(max-width: 760px)").matches;
    const imageTop = narrow ? 132 : 148;
    const frame = document.querySelector<HTMLElement>(".profile-frame");
    const meet = narrow ? imageTop + (frame?.offsetHeight ?? 0) + 28 : imageTop;
    const held = parseFloat(copy.style.transform.replace(/[^\d.-]/g, "")) || 0;
    const docTop = copy.getBoundingClientRect().top - held + window.scrollY;
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
    const stickyTop = 132;
    const pinTop = pin.getBoundingClientRect().top + window.scrollY;
    let top = pinTop - stickyTop;
    if (!reduced) {
      const releaseTravel = Math.max(
        1,
        pin.offsetHeight - (window.innerHeight - stickyTop),
      );
      const travel = Math.max(1, releaseTravel - window.innerHeight * 0.35);
      top = pinTop - stickyTop + travel;
    }
    history.pushState(null, "", "#skills");
    window.scrollTo({
      top: Math.max(0, Math.ceil(top)),
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
      />

      <Logo logoRef={logoRef} onHome={goHome} />

      <p className="scroll-hint" ref={hintRef}>
        <span>Scroll</span>
        <span className="scroll-chevron" aria-hidden="true" />
      </p>

      <main>
        <div className="hero" id="home" />

        <section id="profile" className="profile-pin">
          <div className="profile-stage">
            <div className="profile-slot">
              <ProfilePortrait />
            </div>
            <div className="profile-copy">
              <p className="eyebrow">Profile</p>
              <h2>Jordan Lewin</h2>
              <p className="profile-role">
                Full-stack developer and technical lead
              </p>
              <p className="lede">
                Six years building microservices and internal developer portals.
                I treat every change as part of a wider web of services, teams,
                and workflows, and I look for the side effects before they
                spread.
              </p>
              <p className="lede">
                At TELUS I led full-stack teams shipping OpenShift applications,
                automated workflows for more than 200 engineering teams, and
                took features from Figma through to deployment.
              </p>
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
