import { canvas, defaultLayerSettings, invalidateWarpCache, state } from "./state.js";
import { refreshPaintControls } from "./paint.js";

const PROJECT_VERSION = 1;

function downloadJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "motion-mask-areas.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

function readImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("One of the saved area masks could not be loaded."));
    image.src = source;
  });
}

function normaliseSettings(settings) {
  const result = { ...defaultLayerSettings };
  for (const [key, defaultValue] of Object.entries(defaultLayerSettings)) {
    if (typeof settings?.[key] === typeof defaultValue) result[key] = settings[key];
  }
  return result;
}

function createLayer(maskImage, settings) {
  const mask = document.createElement("canvas");
  mask.width = canvas.width;
  mask.height = canvas.height;
  const context = mask.getContext("2d");
  context.drawImage(maskImage, 0, 0);
  return { mask, context, settings: normaliseSettings(settings), history: [], redo: [] };
}

export function exportAreas() {
  if (!state.image) {
    alert("Open an image before exporting areas.");
    return;
  }

  downloadJson({
    version: PROJECT_VERSION,
    canvas: { width: canvas.width, height: canvas.height },
    layers: state.layers.map((layer) => ({
      settings: layer.settings,
      mask: layer.mask.toDataURL("image/png"),
    })),
  });
}

export async function importAreas(file) {
  if (!state.image) throw new Error("Open the target image before importing areas.");

  const project = JSON.parse(await file.text());
  if (project?.version !== PROJECT_VERSION || !Array.isArray(project.layers) || !project.layers.length) {
    throw new Error("This is not a valid Motion Mask areas file.");
  }
  if (project.canvas?.width !== canvas.width || project.canvas?.height !== canvas.height) {
    throw new Error("The target image must have the same dimensions as the exported areas.");
  }
  if (!project.layers.every((layer) => typeof layer?.mask === "string")) {
    throw new Error("This areas file is missing one or more masks.");
  }

  const maskImages = await Promise.all(project.layers.map((layer) => readImage(layer.mask)));
  if (maskImages.some((mask) => mask.naturalWidth !== canvas.width || mask.naturalHeight !== canvas.height)) {
    throw new Error("The saved mask dimensions do not match the target image.");
  }

  state.layers = project.layers.map((layer, index) => createLayer(maskImages[index], layer.settings));
  state.activeLayerIndex = 0;
  invalidateWarpCache();
  refreshPaintControls();
}
