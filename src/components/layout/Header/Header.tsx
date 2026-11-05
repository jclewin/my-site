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
          Profile
          <span className="line" aria-hidden="true">
            <SynthwaveSheen className="line-sheen" />
          </span>
        </a>
        <a href="#skills" onClick={onSkillsClick}>
          Skills
          <span className="line" aria-hidden="true">
            <SynthwaveSheen className="line-sheen" />
          </span>
        </a>
        <span className="nav-mark" aria-hidden="true" />
        <a href="#projects" onClick={onProjectsClick}>
          Projects
          <span className="line" aria-hidden="true">
            <SynthwaveSheen className="line-sheen" />
          </span>
        </a>
        <a href="#contact">
          Contact
          <span className="line" aria-hidden="true">
            <SynthwaveSheen className="line-sheen" />
          </span>
        </a>
      </div>
      <div className="nav-rule" aria-hidden="true">
        <SynthwaveSheen className="nav-rule-sheen" />
      </div>
    </header>
  );
}
