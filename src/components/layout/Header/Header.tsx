import SynthwaveSheen from "../../common/SynthwaveSheen";

type HeaderProps = {
  navRef: React.RefObject<HTMLElement | null>;
  onProfileClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onSkillsClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onProjectsClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
};

export default function Header({
  navRef,
  onProfileClick,
  onSkillsClick,
  onProjectsClick,
}: HeaderProps) {
  return (
    <header ref={navRef} className="nav">
      <div className="nav-plate">
        <a href="#profile" onClick={onProfileClick}>
          <span className="nav-label">
            Profile
            <span className="line" aria-hidden="true">
              <SynthwaveSheen className="line-sheen" />
            </span>
          </span>
        </a>
        <a href="#skills" onClick={onSkillsClick}>
          <span className="nav-label">
            Skills
            <span className="line" aria-hidden="true">
              <SynthwaveSheen className="line-sheen" />
            </span>
          </span>
        </a>
        <span className="nav-mark" aria-hidden="true" />
        <a href="#projects" onClick={onProjectsClick}>
          <span className="nav-label">
            Projects
            <span className="line" aria-hidden="true">
              <SynthwaveSheen className="line-sheen" />
            </span>
          </span>
        </a>
        <a href="#contact">
          <span className="nav-label">
            Contact
            <span className="line" aria-hidden="true">
              <SynthwaveSheen className="line-sheen" />
            </span>
          </span>
        </a>
      </div>
      <div className="nav-rule" aria-hidden="true">
        <SynthwaveSheen className="nav-rule-sheen" />
      </div>
    </header>
  );
}
