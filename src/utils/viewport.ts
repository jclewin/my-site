const NARROW = 760;
const SHORT = 520;
const HEIGHT_SLOP = 128;

const MOBILE_FACE_DROP = 72;

export type Chrome = {
  nav: number;
  sticky: number;
  frameTop: number;
  faceDrop: number;
  safeTop: number;
  safeBottom: number;
};

type Insets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

let width = 0;
let height = 0;
let chrome: Chrome = {
  nav: 76,
  sticky: 132,
  frameTop: 148,
  faceDrop: 0,
  safeTop: 0,
  safeBottom: 0,
};
let installed = false;

function readInsets(): Insets {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)";
  document.documentElement.appendChild(probe);
  const style = getComputedStyle(probe);
  const read = (side: string) => parseFloat(style.getPropertyValue(side)) || 0;
  const insets = {
    top: read("padding-top"),
    right: read("padding-right"),
    bottom: read("padding-bottom"),
    left: read("padding-left"),
  };
  probe.remove();
  return insets;
}

function publish(insets: Insets) {
  const narrow = width <= NARROW;
  const short = height <= SHORT;
  const nav = short ? 56 + insets.top : narrow ? 64 + insets.top : 76;
  const sticky = short ? nav + 8 : narrow ? nav + 20 : 132;
  const faceDrop = narrow ? MOBILE_FACE_DROP : 0;
  const frameTop = (short || narrow ? sticky : 148) + faceDrop;
  chrome = {
    nav,
    sticky,
    frameTop,
    faceDrop,
    safeTop: insets.top,
    safeBottom: insets.bottom,
  };
  const root = document.documentElement;
  root.style.setProperty("--vh", `${height * 0.01}px`);
  root.style.setProperty("--nav-h", `${nav}px`);
  root.style.setProperty("--sticky", `${sticky}px`);
  root.style.setProperty("--frame-top", `${frameTop}px`);
  root.style.setProperty("--safe-top", `${insets.top}px`);
  root.style.setProperty("--safe-right", `${insets.right}px`);
  root.style.setProperty("--safe-bottom", `${insets.bottom}px`);
  root.style.setProperty("--safe-left", `${insets.left}px`);
}

/** Lock the layout height so the mobile URL bar cannot resize the page mid-scroll. */
export function syncViewport() {
  const nextW = document.documentElement.clientWidth;
  const nextH = window.innerHeight;
  const changed =
    height === 0 ||
    Math.abs(nextW - width) > 1 ||
    Math.abs(nextH - height) > HEIGHT_SLOP;
  if (!changed) return false;
  width = nextW;
  height = nextH;
  publish(readInsets());
  return true;
}

export function stableViewport() {
  return { width, height };
}

export function readChrome() {
  return chrome;
}

export function isStacked() {
  return width <= NARROW || height <= SHORT;
}

export function pixelRatio(kind: "hero" | "canvas" | "portrait") {
  const dpr = window.devicePixelRatio || 1;
  const compact = width <= NARROW || height <= SHORT;
  if (kind === "hero") return Math.min(dpr, 1);
  if (kind === "portrait") return Math.min(dpr, compact ? 1.5 : 2);
  return Math.min(dpr, compact ? 1.25 : 1.5);
}

export function documentTop(element: HTMLElement) {
  let top = 0;
  let node: HTMLElement | null = element;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

export function installViewport() {
  syncViewport();
  if (installed) return;
  installed = true;
  const onResize = () => {
    syncViewport();
  };
  window.addEventListener("resize", onResize);
  window.visualViewport?.addEventListener("resize", onResize);
}
