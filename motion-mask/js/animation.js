import { canvas, ctx, state, animationPresets, warpCache } from "./state.js";

const sourceCanvas = document.createElement("canvas");
const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
const maskCanvas = document.createElement("canvas");
const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });

function smoothStep(value) {
  value = Math.max(0, Math.min(1, value));
  return value * value * (3 - 2 * value);
}

function ensureWarpCache() {
  if (!state.image || warpCache.version === warpCache.invalidatedVersion && warpCache.width === canvas.width && warpCache.height === canvas.height) return;

  const width = canvas.width, height = canvas.height;
  sourceCanvas.width = width; sourceCanvas.height = height;
  sourceContext.clearRect(0, 0, width, height);
  sourceContext.drawImage(state.image, 0, 0, width, height);
  const image = sourceContext.getImageData(0, 0, width, height);

  const layers = state.layers.map((layer) => {
    maskCanvas.width = width; maskCanvas.height = height;
    maskContext.clearRect(0, 0, width, height);
    const blur = Math.max(4, Math.round(6 + (100 - layer.settings.cohesion) * 0.20));
    maskContext.save();
    maskContext.filter = `blur(${blur}px)`;
    maskContext.drawImage(layer.mask, 0, 0, width, height);
    maskContext.restore();

    const rawMask = layer.context.getImageData(0, 0, width, height).data;
    let sumAlpha = 0, sumX = 0, sumY = 0, minY = height, maxY = 0;
    for (let index = 0; index < rawMask.length; index += 4) {
      const alpha = rawMask[index + 3];
      if (!alpha) continue;
      const pixel = index / 4, y = Math.floor(pixel / width);
      sumAlpha += alpha; sumX += (pixel % width) * alpha; sumY += y * alpha;
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    return {
      mask: maskContext.getImageData(0, 0, width, height),
      cx: sumAlpha ? sumX / sumAlpha : width / 2,
      cy: sumAlpha ? sumY / sumAlpha : height / 2,
      minY: maxY >= minY ? minY : 0,
      maxY,
    };
  });

  Object.assign(warpCache, { width, height, image, layers, version: warpCache.invalidatedVersion });
}

function getMotionVector(time, width, height, settings) {
  const preset = animationPresets[settings.preset];
  const cycle = Math.max(.1, settings.cycle);
  const phase = time / cycle * Math.PI * 2;
  const sine = Math.sin(phase), cosine = Math.cos(phase);
  let x = 0, y = 0;
  if (settings.direction !== "preset") {
    if (settings.direction === "left") x = -Math.abs(sine);
    else if (settings.direction === "right") x = Math.abs(sine);
    else if (settings.direction === "up") y = -Math.abs(sine);
    else if (settings.direction === "down") y = Math.abs(sine);
    else if (settings.direction === "horizontal") x = sine;
    else if (settings.direction === "vertical") y = sine;
    else if (settings.direction === "circular") { x = cosine; y = sine; }
  } else {
    switch (preset.mode) {
      case "sway": x = sine; break;
      case "bounce": y = Math.abs(sine) * 2 - 1; break;
      case "wave": x = sine; y = Math.sin(phase * 2) * .28; break;
      case "pulse": x = sine * .72; y = cosine * .72; break;
      case "quake": x = Math.sin(phase * 5) * .75; y = Math.cos(phase * 7) * .75; break;
      default: x = sine; y = cosine * .48;
    }
  }
  const elasticity = .45 + settings.elasticity / 100 * 1.35;
  const stability = .35 + settings.stability / 100 * .65;
  const amplitude = Math.min(width, height) * .16 * (settings.force / 100) * .5 * preset.wave * elasticity * stability;
  const gravity = settings.gravity / 100 * amplitude * .75;
  const angle = settings.gravityAngle * Math.PI / 180;
  return {
    x: x * amplitude + Math.cos(angle) * gravity * (.5 + .5 * (1 - cosine)),
    y: y * amplitude + Math.sin(angle) * gravity * (.5 + .5 * (1 - cosine)),
    phase, amplitude,
    pulseScale: preset.mode === "pulse" ? sine * (amplitude / Math.max(1, Math.min(width, height))) * 1.6 : 0,
  };
}

function samplePixel(source, width, height, x, y, target, index) {
  x = Math.max(0, Math.min(width - 1, x)); y = Math.max(0, Math.min(height - 1, y));
  const x0 = x | 0, y0 = y | 0, x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1), fx = x - x0, fy = y - y0;
  const a = (1 - fx) * (1 - fy), b = fx * (1 - fy), c = (1 - fx) * fy, d = fx * fy;
  const topLeft = (y0 * width + x0) * 4, topRight = (y0 * width + x1) * 4, bottomLeft = (y1 * width + x0) * 4, bottomRight = (y1 * width + x1) * 4;
  for (let channel = 0; channel < 4; channel++) target[index + channel] = source[topLeft + channel] * a + source[topRight + channel] * b + source[bottomLeft + channel] * c + source[bottomRight + channel] * d;
}

function deformLayer(time, layer, cache, source, width, height) {
  const settings = layer.settings, preset = animationPresets[settings.preset];
  const motion = getMotionVector(time % (settings.cycle * 1000) / 1000, width, height, settings);
  const output = new Uint8ClampedArray(source), mask = cache.mask.data;
  const cohesion = settings.cohesion / 100, stability = settings.stability / 100, elasticity = settings.elasticity / 100;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = (y * width + x) * 4;
    let strength = smoothStep(mask[index + 3] / 255);
    strength *= smoothStep(Math.min(1, mask[index + 3] / 255 * 1.35));
    strength *= .55 + cohesion * .45;
    if (!strength) continue;
    if (preset.mode === "bounce" && cache.maxY > cache.minY) {
      const fade = Math.max(8, Math.min(22, (cache.maxY - cache.minY) * .10));
      strength *= smoothStep((y - cache.minY) / fade);
    }
    const elasticWave = 1 + elasticity * .18 * Math.sin(motion.phase * 2 + strength * 2.2);
    let sourceX, sourceY;
    if (preset.mode === "pulse" && settings.direction === "preset") {
      const pulse = 1 + motion.pulseScale * strength * elasticWave;
      sourceX = cache.cx + (x - cache.cx) / pulse; sourceY = cache.cy + (y - cache.cy) / pulse;
    } else {
      sourceX = x - motion.x * strength * elasticWave * (.72 + stability * .28);
      sourceY = y - motion.y * strength * elasticWave * (.72 + stability * .28);
    }
    samplePixel(source, width, height, sourceX, sourceY, output, index);
  }
  return { output, mask };
}

export function renderAnimationFrame(time, target = ctx) {
  if (!state.image) return;
  ensureWarpCache();
  const { width, height, image, layers } = warpCache;
  const source = image.data, result = new Uint8ClampedArray(source);
  state.layers.forEach((layer, index) => {
    const { output, mask } = deformLayer(time, layer, layers[index], source, width, height);
    for (let pixel = 0; pixel < result.length; pixel += 4) if (mask[pixel + 3]) result.set(output.subarray(pixel, pixel + 4), pixel);
  });
  target.putImageData(new ImageData(result, width, height), 0, 0);
}

function animationLoop(timestamp) {
  if (state.isPlaying && state.currentStep === 2 && state.image) renderAnimationFrame(timestamp);
  requestAnimationFrame(animationLoop);
}
export function startAnimationLoop() { requestAnimationFrame(animationLoop); }
