import { readChrome, stableViewport } from "../../utils/viewport";

export const PROJECTS_SETTLE = 0.22;
export const PROJECTS_SLIDE = 0.04;
export const PROJECTS_LEAD = PROJECTS_SLIDE;

/** Visual top of a sticky stage, without reading layout during scroll. */
export function stuckTop(
  naturalTop: number,
  parentTop: number,
  parentHeight: number,
  size: number,
  stick: number,
) {
  const release = parentTop + parentHeight - size;
  if (naturalTop > stick) return naturalTop;
  return Math.min(stick, release);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(t: number) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function projectShift(
  progress: number,
  index: number,
  count: number,
  dock: number,
) {
  const n = Math.max(1, count);
  const slide = Math.min(PROJECTS_SLIDE, 0.5 / (n + 1));
  const hold = (1 - (n + 1) * slide) / n;
  const holdStart = slide + index * (hold + slide);
  const holdEnd = holdStart + hold;

  if (progress < holdStart) {
    const t = smoothstep((progress - (holdStart - slide)) / slide);
    return dock * t;
  }
  if (progress > holdEnd) {
    const t = smoothstep((progress - holdEnd) / slide);
    return dock + (1 - dock) * t;
  }
  return dock;
}

/** How fully the projects stage has covered the viewport. 0 below, 1 once settled. */
export function projectsCover(stageTop: number, viewHeight: number) {
  const start = viewHeight * 0.78;
  const end = Math.min(viewHeight * 0.36, 300);
  return smoothstep((start - stageTop) / Math.max(1, start - end));
}

export function projectsEntryTop(pin: HTMLElement, reduced: boolean) {
  const sticky = readChrome().sticky;
  const viewH = stableViewport().height;
  const top = pin.getBoundingClientRect().top + window.scrollY - sticky;
  if (reduced) return Math.max(0, top);
  const release = Math.max(1, pin.offsetHeight - (viewH - sticky));
  const travel = Math.max(1, release - viewH * PROJECTS_SETTLE);
  return Math.max(0, top + travel * PROJECTS_LEAD);
}
