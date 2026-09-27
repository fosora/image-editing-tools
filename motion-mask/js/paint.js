import { $, $$, canvas, ctx, state, activeLayer, invalidateWarpCache } from "./state.js";

export function drawPaintMask() {
  if (!state.image) return;
  ctx.drawImage(state.image, 0, 0, canvas.width, canvas.height);
  state.layers.forEach((layer, index) => {
    const overlay = document.createElement("canvas");
    overlay.width = canvas.width; overlay.height = canvas.height;
    const overlayContext = overlay.getContext("2d");
    overlayContext.fillStyle = index === state.activeLayerIndex ? "rgba(255,80,120,.34)" : "rgba(124,140,255,.20)";
    overlayContext.fillRect(0, 0, overlay.width, overlay.height);
    overlayContext.globalCompositeOperation = "destination-in";
    overlayContext.drawImage(layer.mask, 0, 0);
    ctx.drawImage(overlay, 0, 0);
  });
}

function updateHistoryButtons() {
  const layer = activeLayer();
  $("#undoButton").disabled = !layer.history.length;
  $("#redoButton").disabled = !layer.redo.length;
}
function savePaintState() {
  const layer = activeLayer();
  layer.history.push(layer.context.getImageData(0, 0, layer.mask.width, layer.mask.height));
  if (layer.history.length > 25) layer.history.shift();
  layer.redo = [];
  updateHistoryButtons();
}
function restorePaintState(imageData) {
  const layer = activeLayer();
  layer.context.putImageData(imageData, 0, 0);
  invalidateWarpCache(); drawPaintMask(); updateHistoryButtons();
}
function pointerPosition(event) {
  const bounds = canvas.getBoundingClientRect();
  return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height };
}
function paintAt(x, y) {
  const layer = activeLayer();
  layer.context.save(); layer.context.globalAlpha = state.paintIntensity;
  if (state.paintTool === "erase") layer.context.globalCompositeOperation = "destination-out";
  else { layer.context.globalCompositeOperation = "source-over"; layer.context.fillStyle = "#fff"; }
  layer.context.beginPath(); layer.context.arc(x, y, state.brushSize / 2, 0, Math.PI * 2); layer.context.fill(); layer.context.restore();
  invalidateWarpCache(); drawPaintMask();
}

export function initializePaintControls() {
  canvas.addEventListener("pointerdown", (event) => {
    if (!state.image) return;
    state.isDrawing = true; canvas.setPointerCapture(event.pointerId); savePaintState();
    const point = pointerPosition(event); paintAt(point.x, point.y);
  });
  canvas.addEventListener("pointermove", (event) => { if (state.isDrawing) { const point = pointerPosition(event); paintAt(point.x, point.y); } });
  ["pointerup", "pointercancel"].forEach((type) => canvas.addEventListener(type, () => { state.isDrawing = false; }));
  $("#brushSize").oninput = (event) => { state.brushSize = +event.target.value; $("#brushOutput").textContent = state.brushSize; };
  $("#brushButton").onclick = () => setPaintTool("brush"); $("#eraseButton").onclick = () => setPaintTool("erase");
  $("#paintIntensity").onclick = (event) => { if (event.target.dataset.v) { state.paintIntensity = +event.target.dataset.v; $$("#paintIntensity button").forEach((button) => button.classList.toggle("active", button === event.target)); } };
  $("#undoButton").onclick = () => { const layer = activeLayer(); if (layer.history.length) { layer.redo.push(layer.context.getImageData(0, 0, layer.mask.width, layer.mask.height)); restorePaintState(layer.history.pop()); } };
  $("#redoButton").onclick = () => { const layer = activeLayer(); if (layer.redo.length) { layer.history.push(layer.context.getImageData(0, 0, layer.mask.width, layer.mask.height)); restorePaintState(layer.redo.pop()); } };
  $("#clearButton").onclick = () => applyMaskChange((layer) => layer.context.clearRect(0, 0, layer.mask.width, layer.mask.height));
  $("#fillButton").onclick = () => applyMaskChange((layer) => { layer.context.globalAlpha = 1; layer.context.fillStyle = "#fff"; layer.context.fillRect(0, 0, layer.mask.width, layer.mask.height); });
  $("#invertButton").onclick = () => applyMaskChange((layer) => { const data = layer.context.getImageData(0, 0, layer.mask.width, layer.mask.height); for (let i = 0; i < data.data.length; i += 4) data.data[i + 3] = 255 - data.data[i + 3]; layer.context.putImageData(data, 0, 0); });
  updateHistoryButtons();
}
function setPaintTool(tool) { state.paintTool = tool; $("#brushButton").classList.toggle("active", tool === "brush"); $("#eraseButton").classList.toggle("active", tool === "erase"); }
function applyMaskChange(change) { savePaintState(); change(activeLayer()); invalidateWarpCache(); drawPaintMask(); }
export function resetPaintHistory() { state.layers.forEach((layer) => { layer.history = []; layer.redo = []; }); updateHistoryButtons(); }
export function refreshPaintControls() { updateHistoryButtons(); drawPaintMask(); }
