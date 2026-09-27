export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => [...document.querySelectorAll(selector)];

export const canvas = $("#canvas");
export const ctx = canvas.getContext("2d");

export const defaultLayerSettings = {
  preset: "jelly", force: 52, elasticity: 48, stability: 58, cohesion: 82,
  gravity: 8, gravityAngle: 90, direction: "preset", cycle: 2.2,
};

function createMask() {
  const mask = document.createElement("canvas");
  mask.width = canvas.width;
  mask.height = canvas.height;
  return { mask, context: mask.getContext("2d"), settings: { ...defaultLayerSettings }, history: [], redo: [] };
}

export const state = {
  image: null,
  paintIntensity: 0.72,
  paintTool: "brush",
  brushSize: 52,
  zoom: 1,
  layers: [createMask()],
  activeLayerIndex: 0,
  isDrawing: false,
  isPlaying: true,
  currentStep: 1,
};

export function activeLayer() { return state.layers[state.activeLayerIndex]; }
export function addLayer() {
  state.layers.push(createMask());
  state.activeLayerIndex = state.layers.length - 1;
  return activeLayer();
}
export function removeActiveLayer() {
  if (state.layers.length === 1) return false;
  state.layers.splice(state.activeLayerIndex, 1);
  state.activeLayerIndex = Math.max(0, state.activeLayerIndex - 1);
  return true;
}
export function resetLayers() { state.layers = [createMask()]; state.activeLayerIndex = 0; }

export const exportSettings = { fps: 20, quality: 80, format: "webm" };

export const animationPresets = {
  jelly: { name: "Jelly", desc: "elastic and smooth", wave: 1, mode: "jelly" },
  sway: { name: "Sway", desc: "back and forth", wave: 1, mode: "sway" },
  bounce: { name: "Bounce", desc: "vertical impulse", wave: 1.08, mode: "bounce" },
  wave: { name: "Wave", desc: "fluid deformation", wave: 0.95, mode: "wave" },
  pulse: { name: "Pulse", desc: "expands and contracts", wave: 0.9, mode: "pulse" },
  quake: { name: "Quake", desc: "fast vibration", wave: 0.72, mode: "quake" },
};

export const warpCache = { invalidatedVersion: 0 };
export function invalidateWarpCache() { warpCache.invalidatedVersion++; }
