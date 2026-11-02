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

uniform sampler2D uImage;
uniform vec2 uCover;
uniform vec2 uResolution;
uniform float uCell;
uniform float uFill;
uniform float uFocus;

varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  // Whole device pixels, centered, so every gap is exactly one pixel wide.
  float coarse = max(4.0, floor(uCell + 0.5));
  vec2 origin = floor(uResolution * 0.5);
  vec2 pixel = floor(gl_FragCoord.xy) - origin;
  vec2 coarseId = floor(pixel / coarse + 0.5);
  if (uFill <= 0.0 || hash(coarseId) > uFill) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec2 uv = clamp((vUv - 0.5) * uCover + 0.5, 0.001, 0.999);
  if (uFocus > 0.92) {
    gl_FragColor = vec4(texture2D(uImage, uv).rgb, 1.0);
    return;
  }

  float cell = max(1.0, floor(coarse / exp2(floor(clamp(uFocus, 0.0, 0.999) * 3.0)) + 0.5));
  vec2 id = floor(pixel / cell + 0.5);
  vec2 inCell = mod(pixel + cell * 0.5, cell);
  if (inCell.x < 1.0 || inCell.y < 1.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec2 center = (origin + id * cell + 0.5) / uResolution;
  vec2 sampleUv = clamp((center - 0.5) * uCover + 0.5, 0.001, 0.999);
  gl_FragColor = vec4(texture2D(uImage, sampleUv).rgb, 1.0);
}
`;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const CELL = 16;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

export default function ProfilePortrait() {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const pin = document.getElementById("profile");
    if (!frame || !canvas || !img || !pin) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
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

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(program, "uImage"), 0);

    const coverLoc = gl.getUniformLocation(program, "uCover");
    const resolutionLoc = gl.getUniformLocation(program, "uResolution");
    const cellLoc = gl.getUniformLocation(program, "uCell");
    const fillLoc = gl.getUniformLocation(program, "uFill");
    const focusLoc = gl.getUniformLocation(program, "uFocus");
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrowQuery = window.matchMedia("(max-width: 760px)");
    let alive = true;
    let tick = 0;
    let ready = false;
    let imgW = 1;
    let imgH = 1;

    const upload = () => {
      if (!alive || !img.naturalWidth) return;
      imgW = img.naturalWidth;
      imgH = img.naturalHeight;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      ready = true;
      frame.classList.add("is-gl");
      requestApply();
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextW = Math.max(1, Math.round(rect.width * dpr));
      const nextH = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
      }
    };

    const place = () => {
      const slot = frame.parentElement;
      if (!slot || motionQuery.matches) {
        frame.style.left = "";
        frame.style.visibility = "";
        return;
      }
      const slotRect = slot.getBoundingClientRect();
      const pinRect = pin.getBoundingClientRect();
      const skills = document.getElementById("skills");
      const skillsTop = skills?.getBoundingClientRect().top ?? Infinity;
      const imageTop = narrowQuery.matches ? 132 : 148;
      const imageBottom = imageTop + frame.offsetHeight;
      const covered = skillsTop < imageBottom - 24;
      const upcoming = pinRect.top > window.innerHeight + 40;
      frame.style.left = `${slotRect.left}px`;
      frame.style.visibility = covered || upcoming ? "hidden" : "visible";
    };

    let held = 0;

    const portraitState = () => {
      const copy = pin.querySelector<HTMLElement>(".profile-copy");
      if (motionQuery.matches || !copy) {
        held = 0;
        if (copy) copy.style.transform = "";
        return { fill: 1, focus: 1 };
      }
      const viewH = window.innerHeight;
      const imageTop = narrowQuery.matches ? 132 : 148;
      const meet = narrowQuery.matches
        ? imageTop + frame.offsetHeight + 28
        : imageTop;
      const layoutTop = copy.getBoundingClientRect().top - held;
      // Same timing as the nav's bottom border in App: it finishes
      // 120px after max(viewH * 0.65, 280). Pixels begin a little after that.
      const borderIn = Math.max(viewH * 0.65, 280) + 120 + viewH * 0.08;
      const start = Math.max(meet + 160, layoutTop + window.scrollY - borderIn);
      if (layoutTop > meet) {
        held = 0;
        copy.style.transform = "";
        const t = clamp((start - layoutTop) / Math.max(1, start - meet), 0, 1);
        if (t < 0.58) return { fill: t / 0.58, focus: 0 };
        return { fill: 1, focus: (t - 0.58) / 0.42 };
      }
      const past = meet - layoutTop;
      const hold = viewH * 0.52;
      if (past < hold) {
        held = past;
        copy.style.transform = `translateY(${held}px)`;
        return { fill: 1, focus: 1 };
      }
      held = hold;
      copy.style.transform = `translateY(${held}px)`;
      const leave = clamp((past - hold) / (viewH * 0.5), 0, 1);
      if (leave < 0.42) return { fill: 1, focus: 1 - leave / 0.42 };
      return { fill: 1 - (leave - 0.42) / 0.58, focus: 0 };
    };

    const draw = () => {
      place();
      resize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!ready || frame.style.visibility === "hidden") return;

      const state = portraitState();
      const viewAspect = canvas.width / Math.max(1, canvas.height);
      const imgAspect = imgW / imgH;
      const cover =
        imgAspect > viewAspect
          ? [viewAspect / imgAspect, 1]
          : [1, imgAspect / viewAspect];
      const dpr = canvas.width / Math.max(1, canvas.clientWidth);

      gl.uniform2f(coverLoc, cover[0], cover[1]);
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
      gl.uniform1f(cellLoc, Math.max(4, Math.round(CELL * dpr)));
      gl.uniform1f(fillLoc, state.fill);
      gl.uniform1f(focusLoc, state.focus);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const requestApply = () => {
      if (tick) return;
      tick = requestAnimationFrame(() => {
        tick = 0;
        if (alive) draw();
      });
    };

    if (img.complete) upload();
    img.addEventListener("load", upload);
    requestApply();
    window.addEventListener("scroll", requestApply, { passive: true });
    window.addEventListener("resize", requestApply);
    motionQuery.addEventListener("change", requestApply);
    narrowQuery.addEventListener("change", requestApply);

    return () => {
      alive = false;
      frame.classList.remove("is-gl");
      img.removeEventListener("load", upload);
      pin
        .querySelector<HTMLElement>(".profile-copy")
        ?.style.setProperty("transform", "");
      window.removeEventListener("scroll", requestApply);
      window.removeEventListener("resize", requestApply);
      motionQuery.removeEventListener("change", requestApply);
      narrowQuery.removeEventListener("change", requestApply);
      if (tick) cancelAnimationFrame(tick);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return (
    <div ref={frameRef} className="profile-frame">
      <img
        ref={imgRef}
        src="/profile.png"
        alt="Illustrated portrait"
        draggable={false}
      />
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
