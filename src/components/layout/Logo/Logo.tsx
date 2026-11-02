import SynthwaveSheen from "../../common/SynthwaveSheen";

const CELLS = [
  1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1,
];

type LogoProps = {
  logoRef: React.RefObject<HTMLButtonElement | null>;
  onHome: () => void;
};

export default function Logo({ logoRef, onHome }: LogoProps) {
  return (
    <button
      ref={logoRef}
      className="logo"
      type="button"
      aria-label="JL, go to home"
      onClick={onHome}
    >
      <SynthwaveSheen />
      {CELLS.map((on, index) => (
        <span key={index} className={on ? "cell on" : "cell"} />
      ))}
    </button>
  );
}
