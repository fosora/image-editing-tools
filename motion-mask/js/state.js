export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => [...document.querySelectorAll(selector)];

export const canvas = $("#canvas");
export const ctx = canvas.getContext("2d");
export const mask = document.createElement("canvas");
export const mctx = mask.getContext("2d");

export const state = {
  image: null,
  paintIntensity: 0.72,
  paintTool: "brush",
  brushSize: 52,
  history: [],
  redo: [],
  isDrawing: false,
  isPlaying: true,
  currentStep: 1,
};

export const animationSettings = {
  preset: "jelly", force: 52, elasticity: 48, stability: 58, cohesion: 82,
  gravity: 8, gravityAngle: 90, direction: "preset", cycle: 2.2,
  fps: 20, quality: 80, format: "webm",
};

export const animationPresets = {
  jelly: { name: "Jelly", desc: "elastic and smooth", wave: 1, mode: "jelly" },
  sway: { name: "Sway", desc: "back and forth", wave: 1, mode: "sway" },
  bounce: { name: "Bounce", desc: "vertical impulse", wave: 1.08, mode: "bounce" },
  wave: { name: "Wave", desc: "fluid deformation", wave: 0.95, mode: "wave" },
  pulse: { name: "Pulse", desc: "expands and contracts", wave: 0.9, mode: "pulse" },
  quake: { name: "Quake", desc: "fast vibration", wave: 0.72, mode: "quake" },
};

export const warpCache = { w: 0 };
export function invalidateWarpCache() { warpCache.w = 0; }
