import { useEffect, useRef } from "react";

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
varying vec2 vUv;

vec3 ramp(float t) {
  vec3 yellow = vec3(1.0, 0.8275, 0.0980); // #FFD319
  vec3 cyan = vec3(0.1765, 0.8863, 0.9020); // #2DE2E6
  vec3 pink = vec3(1.0, 0.4627, 1.0); // #FF76FF
  vec3 purple = vec3(0.3294, 0.0510, 0.4314); // #540D6E

  float u = fract(t);
  u = u < 0.5 ? u * 2.0 : (1.0 - u) * 2.0;
  vec3 color = yellow;
  color = mix(color, cyan, smoothstep(0.0, 0.22, u));
  color = mix(color, pink, smoothstep(0.22, 0.46, u));
  color = mix(color, purple, smoothstep(0.46, 0.68, u));
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
  uv /= 1.15;

  float drift = uTime * 0.11;
  float d = -drift;
  float a = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    a += cos(fi - d - a * uv.x);
    d += sin(uv.y * fi + a);
  }
  d += drift;

  float bands = cos(uv.x * 1.35 + d * 0.22) * 0.5 + 0.5;
  float cross = cos(uv.y * 1.05 + a * 0.18) * 0.5 + 0.5;
  vec3 col = ramp(bands * 0.62 + cross * 0.38);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function compile(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

export default function SynthwaveSheen({
  className = "logo-sheen",
}: {
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!gl) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

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
    const pointer = { x: 0.5, y: 0.5 };
    let originX = 0;
    let originY = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 1;
    let height = 1;
    let frame = 0;
    let alive = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    };

    const draw = (now: number) => {
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
      resize();
      draw(now);
      frame = requestAnimationFrame(tick);
    };

    const onPointer = (event: PointerEvent) => {
      pointer.x = event.clientX / Math.max(1, window.innerWidth);
      pointer.y = 1 - event.clientY / Math.max(1, window.innerHeight);
    };

    resize();
    draw(0);
    if (!reduced) frame = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
