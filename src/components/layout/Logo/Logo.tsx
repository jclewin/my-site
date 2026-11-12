import SynthwaveSheen from "../../common/SynthwaveSheen";

// 6 columns: stroke, j-flex, stroke, stroke, stroke, l-flex.
// 4 rows: stroke, mid, stroke, stroke.
// The sheen clips to this same grid, so the letter still reads when
// Safari paints the WebGL canvas above the cells.
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
      <SynthwaveSheen letterMask={CELLS} letterColumns={6} />
      <span className="logo-mark">
        {CELLS.map((on, index) => (
          <span key={index} className={on ? "cell on" : "cell"} />
        ))}
      </span>
    </button>
  );
}
