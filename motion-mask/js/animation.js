import { canvas, ctx, state, animationPresets } from "./state.js";

function smoothStep(value) { value = Math.max(0, Math.min(1, value)); return value * value * (3 - 2 * value); }
function maskMetrics(layer, width, height) {
  const data = layer.context.getImageData(0, 0, width, height).data;
  let sum = 0, sumX = 0, sumY = 0, minY = height, maxY = 0;
  for (let i = 0; i < data.length; i += 4) { const alpha = data[i + 3]; if (alpha) { const pixel = i / 4; const y = Math.floor(pixel / width); sum += alpha; sumX += (pixel % width) * alpha; sumY += y * alpha; minY = Math.min(minY, y); maxY = Math.max(maxY, y); } }
  return { data, cx: sum ? sumX / sum : width / 2, cy: sum ? sumY / sum : height / 2, minY, maxY };
}
function getMotionVector(time, width, height, settings) {
  const preset = animationPresets[settings.preset], phase = time / Math.max(.1, settings.cycle) * Math.PI * 2;
  const sine = Math.sin(phase), cosine = Math.cos(phase); let x = 0, y = 0;
  if (settings.direction !== "preset") {
    if (settings.direction === "left") x = -Math.abs(sine); else if (settings.direction === "right") x = Math.abs(sine);
    else if (settings.direction === "up") y = -Math.abs(sine); else if (settings.direction === "down") y = Math.abs(sine);
    else if (settings.direction === "horizontal") x = sine; else if (settings.direction === "vertical") y = sine;
    else if (settings.direction === "circular") { x = cosine; y = sine; }
  } else {
    if (preset.mode === "sway") x = sine; else if (preset.mode === "bounce") y = Math.abs(sine) * 2 - 1;
    else if (preset.mode === "wave") { x = sine; y = Math.sin(phase * 2) * .28; } else if (preset.mode === "pulse") { x = sine * .72; y = cosine * .72; }
    else if (preset.mode === "quake") { x = Math.sin(phase * 5) * .75; y = Math.cos(phase * 7) * .75; } else { x = sine; y = cosine * .48; }
  }
  const amplitude = Math.min(width, height) * .08 * (settings.force / 100) * preset.wave * (.45 + settings.elasticity / 100 * 1.35) * (.35 + settings.stability / 100 * .65);
  const gravity = settings.gravity / 100 * amplitude * .75, angle = settings.gravityAngle * Math.PI / 180;
  return { x: x * amplitude + Math.cos(angle) * gravity * (1 - cosine / 2), y: y * amplitude + Math.sin(angle) * gravity * (1 - cosine / 2), phase, amplitude };
}
function sample(source, width, height, x, y, target, offset) {
  x = Math.max(0, Math.min(width - 1, x)); y = Math.max(0, Math.min(height - 1, y));
  const x0 = x | 0, y0 = y | 0, x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1), fx = x - x0, fy = y - y0;
  const a = (1 - fx) * (1 - fy), b = fx * (1 - fy), c = (1 - fx) * fy, d = fx * fy;
  const p00 = (y0 * width + x0) * 4, p10 = (y0 * width + x1) * 4, p01 = (y1 * width + x0) * 4, p11 = (y1 * width + x1) * 4;
  for (let channel = 0; channel < 4; channel++) target[offset + channel] = source[p00 + channel] * a + source[p10 + channel] * b + source[p01 + channel] * c + source[p11 + channel] * d;
}

export function renderAnimationFrame(time, target = ctx) {
  if (!state.image) return;
  const width = canvas.width, height = canvas.height, base = document.createElement("canvas"); base.width = width; base.height = height;
  const baseContext = base.getContext("2d"); baseContext.drawImage(state.image, 0, 0, width, height);
  let source = baseContext.getImageData(0, 0, width, height).data;
  state.layers.forEach((layer) => {
    const settings = layer.settings, metrics = maskMetrics(layer, width, height), motion = getMotionVector((time % (settings.cycle * 1000)) / 1000, width, height, settings);
    const output = new Uint8ClampedArray(source), cohesion = settings.cohesion / 100, elasticity = settings.elasticity / 100, stability = settings.stability / 100;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4; let strength = smoothStep(metrics.data[offset + 3] / 255); strength *= smoothStep(Math.min(1, metrics.data[offset + 3] / 255 * 1.35)) * (.55 + cohesion * .45);
      if (!strength) continue;
      if (animationPresets[settings.preset].mode === "bounce" && metrics.maxY > metrics.minY) strength *= smoothStep((y - metrics.minY) / Math.max(8, Math.min(22, (metrics.maxY - metrics.minY) * .1)));
      const wave = 1 + elasticity * .18 * Math.sin(motion.phase * 2 + strength * 2.2); let sx, sy;
      if (animationPresets[settings.preset].mode === "pulse" && settings.direction === "preset") { const scale = 1 + Math.sin(motion.phase) * motion.amplitude / Math.min(width, height) * 1.6 * strength * wave; sx = metrics.cx + (x - metrics.cx) / scale; sy = metrics.cy + (y - metrics.cy) / scale; }
      else { sx = x - motion.x * strength * wave * (.72 + stability * .28); sy = y - motion.y * strength * wave * (.72 + stability * .28); }
      sample(source, width, height, sx, sy, output, offset);
    }
    source = output;
  });
  const frame = new ImageData(source, width, height); target.putImageData(frame, 0, 0);
}
function animationLoop(timestamp) { if (state.isPlaying && state.currentStep === 2 && state.image) renderAnimationFrame(timestamp); requestAnimationFrame(animationLoop); }
export function startAnimationLoop() { requestAnimationFrame(animationLoop); }
