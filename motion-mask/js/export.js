import { canvas, exportSettings, state, invalidateWarpCache } from "./state.js";
import { renderAnimationFrame } from "./animation.js";

const GIF_PALETTE_SIZE = 256;

function withOriginalImageCanvas(task) {
  if (!state.image) return Promise.resolve(null);

  const previousSize = { width: canvas.width, height: canvas.height };
  const previousMasks = state.layers.map((layer) => {
    const stored = document.createElement("canvas");
    stored.width = layer.mask.width;
    stored.height = layer.mask.height;
    if (stored.width && stored.height) {
      stored.getContext("2d").drawImage(layer.mask, 0, 0);
    }
    return stored;
  });

  const targetWidth = state.image.width;
  const targetHeight = state.image.height;

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  state.layers.forEach((layer, index) => {
    layer.mask.width = targetWidth;
    layer.mask.height = targetHeight;
    if (previousMasks[index].width && previousMasks[index].height) {
      layer.context.clearRect(0, 0, targetWidth, targetHeight);
      layer.context.drawImage(previousMasks[index], 0, 0, previousMasks[index].width, previousMasks[index].height, 0, 0, targetWidth, targetHeight);
    }
  });

  invalidateWarpCache();

  return Promise.resolve(task()).finally(() => {
    canvas.width = previousSize.width;
    canvas.height = previousSize.height;

    state.layers.forEach((layer, index) => {
      const savedMask = previousMasks[index];
      layer.mask.width = savedMask.width;
      layer.mask.height = savedMask.height;
      if (savedMask.width && savedMask.height) {
        layer.context.clearRect(0, 0, savedMask.width, savedMask.height);
        layer.context.drawImage(savedMask, 0, 0);
      }
    });

    invalidateWarpCache();
  });
}

function animationDuration() {
  return Math.max(...state.layers.map((layer) => layer.settings.cycle)) * 1000;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function gifPalette() {
  const palette = new Uint8Array(GIF_PALETTE_SIZE * 3);
  for (let index = 0; index < GIF_PALETTE_SIZE; index++) {
   palette[index * 3] = (index >> 5) * 255 / 7;
   palette[index * 3 + 1] = ((index >> 2) & 7) * 255 / 7;
   palette[index * 3 + 2] = (index & 3) * 255 / 3;
  }
  return palette;
}

function gifHeader(width, height) {
  const bytes = [71, 73, 70, 56, 57, 97, width & 255, width >> 8, height & 255, height >> 8, 0xF7, 0, 0];
  return new Uint8Array([...bytes, ...gifPalette()]);
}

function gifIndexes(rgba) {
  const indexes = new Uint8Array(rgba.length / 4);
  for (let source = 0, target = 0; source < rgba.length; source += 4, target++) {
   indexes[target] = (rgba[source] & 0xE0) | ((rgba[source + 1] & 0xE0) >> 3) | (rgba[source + 2] >> 6);
  }
  return indexes;
}

async function lzwEncode(indexes) {
  const minimumCodeSize = 8;
  const clearCode = 1 << minimumCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minimumCodeSize + 1;
  let nextCode = endCode + 1;
  let dictionary = new Map();
  const output = [];
  let bitBuffer = 0;
  let bitCount = 0;
  const writeCode = (code) => {
   bitBuffer |= code << bitCount;
   bitCount += codeSize;
   while (bitCount >= 8) { output.push(bitBuffer & 255); bitBuffer >>= 8; bitCount -= 8; }
  };

  writeCode(clearCode);
  if (!indexes.length) { writeCode(endCode); return output; }
  let sequence = String(indexes[0]);
  for (let index = 1; index < indexes.length; index++) {
   const pixel = indexes[index];
   const candidate = sequence + "," + pixel;
   if (dictionary.has(candidate)) {
    sequence = candidate;
   } else {
    writeCode(dictionary.get(sequence) ?? Number(sequence));
    if (nextCode < 4096) {
     dictionary.set(candidate, nextCode++);
     // The decoder learns this entry after reading the next code, so grow one code later.
     if (nextCode === (1 << codeSize) + 1 && codeSize < 12) codeSize++;
    }
    sequence = String(pixel);
   }
   // GIF encoding can process millions of pixels. Yield periodically so it never blocks the UI.
   if (index && index % 32768 === 0) await nextFrame();
  }
  if (sequence) writeCode(dictionary.get(sequence) ?? Number(sequence));
  writeCode(endCode);
  if (bitCount) output.push(bitBuffer & 255);
  return output;
}

async function gifFrame(rgba, width, height, fps) {
  const data = await lzwEncode(gifIndexes(rgba));
  const delay = Math.max(1, Math.round(100 / fps));
  const bytes = [0x21, 0xF9, 4, 0x04, delay & 255, delay >> 8, 0, 0, 0x2C, 0, 0, 0, 0, width & 255, width >> 8, height & 255, height >> 8, 0, 8];
  for (let index = 0; index < data.length; index += 255) bytes.push(Math.min(255, data.length - index), ...data.slice(index, index + 255));
  bytes.push(0);
  return new Uint8Array(bytes);
}

export async function exportWebM(){
  return withOriginalImageCanvas(async () => {
    const width = state.image.width;
    const height = state.image.height;
    const recCanvas = document.createElement("canvas");
    recCanvas.width = width;
    recCanvas.height = height;
    const rctx = recCanvas.getContext("2d");
    const stream = recCanvas.captureStream(exportSettings.fps);
    let mime = "video/webm;codecs=vp9";
    if (!MediaRecorder.isTypeSupported(mime)) mime = "video/webm";
    const chunks = [];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: Math.round(2500000 * exportSettings.quality / 100) });
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((res) => rec.onstop = () => res(new Blob(chunks, { type: mime })));
    rec.start(100);
    const total = animationDuration(), start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      if (elapsed >= total) { rec.stop(); return; }
      renderAnimationFrame(elapsed, rctx);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return done;
  });
}

export async function exportGIF(){
  return withOriginalImageCanvas(async () => {
    const width = state.image.width, height = state.image.height;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = width;
    exportCanvas.height = height;
    const context = exportCanvas.getContext("2d");
    const count = Math.round(animationDuration() / 1000 * exportSettings.fps);
    const chunks = [gifHeader(width, height)];
    for (let index = 0; index < count; index++) {
      renderAnimationFrame(index / exportSettings.fps * 1000, context);
      chunks.push(await gifFrame(context.getImageData(0, 0, width, height).data, width, height, exportSettings.fps));
      await nextFrame();
    }
    chunks.push(new Uint8Array([0x3B]));
    return new Blob(chunks, { type: "image/gif" });
  });
}

export async function exportVideoMP4(){
  return withOriginalImageCanvas(async () => {
    const width = state.image.width, height = state.image.height;
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const x = c.getContext("2d");
    const stream = c.captureStream(exportSettings.fps);
    const types = ["video/mp4;codecs=avc1", "video/mp4;codecs=mp4v.20.8", "video/mp4"];
    const mime = types.find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type));
    if (!mime) throw new Error("MP4 is not supported in this browser. Use WebM.");
    const chunks = [], r = new MediaRecorder(stream, { mimeType: mime });
    r.ondataavailable = (event) => event.data.size && chunks.push(event.data);
    const p = new Promise((resolve) => r.onstop = () => resolve(new Blob(chunks, { type: mime })));
    r.start();
    const total = animationDuration(), start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      if (elapsed >= total) { r.stop(); return; }
      renderAnimationFrame(elapsed, x);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return p;
  });
}
