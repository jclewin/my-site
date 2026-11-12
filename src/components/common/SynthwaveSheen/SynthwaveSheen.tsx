import { useEffect, useRef } from "react";
import { pixelRatio } from "../../../utils/viewport";

const VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT = `
precision highp float;
uniform vec2 uOrigin;
uniform vec2 uSize;
uniform vec2 uViewport;
uniform float uTime;
uniform vec2 uMouse;
uniform vec4 uLetter;
uniform vec2 uMaskSize;
uniform float uClip;
uniform sampler2D uMask;
varying vec2 vUv;

float trackColumn(float x, vec4 t) {
  float s = t.x;
  float x1 = s;
  float x2 = s + t.y;
  float x3 = x2 + s;
  float x4 = x3 + s;
  float x5 = x4 + s;
  float x6 = x5 + t.w;
  if (x < 0.0 || x >= x6) return -1.0;
  if (x < x1) return 0.0;
  if (x < x2) return 1.0;
  if (x < x3) return 2.0;
  if (x < x4) return 3.0;
  if (x < x5) return 4.0;
  return 5.0;
}

float trackRow(float y, vec4 t) {
  float y1 = t.x;
  float y2 = t.x + t.z;
  float y3 = y2 + t.x;
  float y4 = y3 + t.x;
  if (y < 0.0 || y >= y4) return -1.0;
  if (y < y1) return 0.0;
  if (y < y2) return 1.0;
  if (y < y3) return 2.0;
  return 3.0;
}

vec3 ramp(float t) {
  vec3 yellow = vec3(1.0, 0.8275, 0.0980); // #FFD319
  vec3 cyan = vec3(0.1765, 0.8863, 0.9020); // #2DE2E6
  vec3 pink = vec3(1.0, 0.4627, 1.0); // #FF76FF
  vec3 purple = vec3(0.3294, 0.0510, 0.4314); // #540D6E

  float u = fract(t);
  u = u < 0.5 ? u * 2.0 : (1.0 - u) * 2.0;
  // The fold only travels through the low end of this wave, so purple
  // has to sit in that range or it never shows up as more than an edge.
  vec3 color = yellow;
  color = mix(color, cyan, smoothstep(0.0, 0.11, u));
  color = mix(color, pink, smoothstep(0.08, 0.17, u));
  color = mix(color, purple, smoothstep(0.14, 0.26, u));
  return color;
}

void main() {
  vec2 screen = vec2(
    uOrigin.x + vUv.x * uSize.x,
    uOrigin.y + (1.0 - vUv.y) * uSize.y
  );
  float mr = max(1.0, min(uViewport.x, uViewport.y));
  vec2 ndc = vec2(screen.x / uViewport.x, 1.0 - screen.y / uViewport.y);
  vec2 uv = (ndc * 2.0 - 1.0) * (uViewport / mr);
  vec2 fromCenter = vec2(vUv.x - 0.5, vUv.y - 0.5) * uSize / mr * 2.0;
  float span = max(uSize.x, uSize.y);
  float cover = clamp(span / max(max(uViewport.x, uViewport.y), 1.0), 0.0, 1.0);
  float zoom = mix(4.6, 1.0, smoothstep(0.12, 0.5, cover));
  uv += fromCenter * (zoom - 1.0);
  uv += (uMouse - vec2(0.5)) * 0.1;

  // Same warp as the iridescence field. Multiplying uv by the running
  // fold makes the color regions curl and travel, instead of nudging
  // a nearly fixed band pattern.
  float drift = uTime * 0.5;
  float d = -drift;
  float a = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    a += cos(fi - d - a * uv.x);
    d += sin(uv.y * fi + a);
  }
  d += drift;

  vec3 tone = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  tone = cos(tone * cos(vec3(d, a, 2.5)) * 0.5 + 0.5);
  float t = dot(tone, vec3(0.42, 0.36, 0.22)) * 0.5 + 0.5;
  vec3 col = ramp(t);
  float alpha = 1.0;
  if (uClip > 0.5) {
    vec2 local = vec2(vUv.x * uSize.x, (1.0 - vUv.y) * uSize.y);
    float colIndex = trackColumn(local.x, uLetter);
    float rowIndex = trackRow(local.y, uLetter);
    if (uLetter.x <= 0.0 || colIndex < 0.0 || rowIndex < 0.0) {
      alpha = 0.0;
    } else {
      vec2 maskUv = (vec2(colIndex, rowIndex) + 0.5) / uMaskSize;
      alpha = texture2D(uMask, maskUv).r;
    }
  }
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const LETTER_COLUMNS = 6;
const LETTER_ROWS = 4;

function mountField(
  canvas: HTMLCanvasElement,
  letterMask?: readonly number[],
  letterColumns = LETTER_COLUMNS,
) {
  const clipLetter =
    !!letterMask &&
    letterColumns === LETTER_COLUMNS &&
    letterMask.length === LETTER_COLUMNS * LETTER_ROWS;
  const gl = canvas.getContext("webgl", {
    alpha: clipLetter,
    antialias: false,
    premultipliedAlpha: clipLetter,
  });
  if (!gl) return () => {};

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return () => {};

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return () => {};

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const origin = gl.getUniformLocation(program, "uOrigin");
  const size = gl.getUniformLocation(program, "uSize");
  const viewport = gl.getUniformLocation(program, "uViewport");
  const time = gl.getUniformLocation(program, "uTime");
  const mouse = gl.getUniformLocation(program, "uMouse");
  const letter = gl.getUniformLocation(program, "uLetter");
  const maskSize = gl.getUniformLocation(program, "uMaskSize");
  const clip = gl.getUniformLocation(program, "uClip");
  const maskSampler = gl.getUniformLocation(program, "uMask");
  const pointer = { x: 0.5, y: 0.5 };
  const maskTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, maskTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  if (clipLetter && letterMask) {
    const pixels = new Uint8Array(LETTER_COLUMNS * LETTER_ROWS * 4);
    for (let i = 0; i < letterMask.length; i++) {
      const on = letterMask[i] ? 255 : 0;
      pixels[i * 4] = on;
      pixels[i * 4 + 3] = 255;
    }
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      LETTER_COLUMNS,
      LETTER_ROWS,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    gl.uniform2f(maskSize, LETTER_COLUMNS, LETTER_ROWS);
  } else {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    );
    gl.uniform2f(maskSize, 1, 1);
  }
  gl.uniform1i(maskSampler, 0);
  gl.uniform1f(clip, clipLetter ? 1 : 0);
  gl.uniform4f(letter, 0, 0, 0, 0);
  const reduced = reducedMotion();
  let originX = 0;
  let originY = 0;
  let width = 1;
  let height = 1;
  let frame = 0;
  let alive = true;
  let visible = true;
  let running = false;
  let dirty = true;
  let letterKey = "";

  const syncLetter = () => {
    if (!clipLetter) return;
    const style = getComputedStyle(canvas);
    const next = ["--stroke", "--j-flex", "--mid", "--l-flex"]
      .map((name) => style.getPropertyValue(name).trim())
      .join(" ");
    if (next === letterKey) return;
    letterKey = next;
    const [stroke, jFlex, mid, lFlex] = next
      .split(" ")
      .map((part) => parseFloat(part) || 0);
    gl.uniform4f(letter, stroke, jFlex, mid, lFlex);
  };

  const measure = () => {
    const rect = canvas.getBoundingClientRect();
    const area = rect.width * rect.height;
    const dpr = area > 160000 ? pixelRatio("hero") : pixelRatio("canvas");
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    originX = rect.left;
    originY = rect.top;
    const nextW = Math.max(1, Math.round(width * dpr));
    const nextH = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== nextW || canvas.height !== nextH) {
      canvas.width = nextW;
      canvas.height = nextH;
    }
    dirty = false;
    return area > 4;
  };

  const draw = (now: number) => {
    if (dirty) measure();
    syncLetter();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(origin, originX, originY);
    gl.uniform2f(size, width, height);
    gl.uniform2f(viewport, window.innerWidth, window.innerHeight);
    gl.uniform1f(time, reduced ? 0 : now * 0.001);
    gl.uniform2f(mouse, pointer.x, pointer.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const tick = (now: number) => {
    if (!alive) return;
    if (!visible) {
      running = false;
      return;
    }
    draw(now);
    frame = requestAnimationFrame(tick);
  };

  const wake = () => {
    if (!running && alive && visible && !reduced) {
      running = true;
      frame = requestAnimationFrame(tick);
    }
  };

  const mark = () => {
    if (!visible) return;
    dirty = true;
  };

  const onPointer = (event: PointerEvent) => {
    pointer.x = event.clientX / Math.max(1, window.innerWidth);
    pointer.y = 1 - event.clientY / Math.max(1, window.innerHeight);
  };

  const redraw = () => {
    if (!alive || !visible) return;
    dirty = true;
    if (reduced) {
      draw(performance.now());
      return;
    }
    wake();
  };

  const resizeObserver = new ResizeObserver(redraw);
  resizeObserver.observe(canvas);
  const intersection = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) redraw();
  });
  intersection.observe(canvas);
  window.addEventListener("scroll", mark, { passive: true });
  window.addEventListener("resize", mark);
  window.addEventListener("pointermove", onPointer, { passive: true });

  measure();
  draw(0);
  wake();

  return () => {
    alive = false;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersection.disconnect();
    window.removeEventListener("scroll", mark);
    window.removeEventListener("resize", mark);
    window.removeEventListener("pointermove", onPointer);
    gl.deleteTexture(maskTexture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
  };
}

export default function SynthwaveSheen({
  className = "logo-sheen",
  letterMask,
  letterColumns = LETTER_COLUMNS,
}: {
  className?: string;
  letterMask?: readonly number[];
  letterColumns?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return mountField(canvas, letterMask, letterColumns);
  }, [letterMask, letterColumns]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
