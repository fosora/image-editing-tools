import { $, $$, canvas, ctx, mask, mctx, state, invalidateWarpCache } from "./state.js";

export function drawPaintMask() {
  if (!state.image) return;
  const overlay = document.createElement("canvas");
  overlay.width = canvas.width; overlay.height = canvas.height;
  const overlayContext = overlay.getContext("2d");
  overlayContext.fillStyle = "rgba(255,80,120,.34)";
  overlayContext.fillRect(0, 0, overlay.width, overlay.height);
  overlayContext.globalCompositeOperation = "destination-in";
  overlayContext.drawImage(mask, 0, 0);
  ctx.drawImage(state.image, 0, 0, canvas.width, canvas.height);
  ctx.drawImage(overlay, 0, 0);
}

function updateHistoryButtons() {
  $("#undoButton").disabled = !state.history.length;
  $("#redoButton").disabled = !state.redo.length;
}
function savePaintState() {
  state.history.push(mctx.getImageData(0, 0, mask.width, mask.height));
  if (state.history.length > 25) state.history.shift();
  state.redo = [];
  updateHistoryButtons();
}
function restorePaintState(imageData) {
  mctx.putImageData(imageData, 0, 0);
  invalidateWarpCache(); drawPaintMask(); updateHistoryButtons();
}
function pointerPosition(event) {
  const bounds = canvas.getBoundingClientRect();
  return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height };
}
function paintAt(x, y) {
  mctx.save(); mctx.globalAlpha = state.paintIntensity;
  if (state.paintTool === "erase") mctx.globalCompositeOperation = "destination-out";
  else { mctx.globalCompositeOperation = "source-over"; mctx.fillStyle = "#fff"; }
  mctx.beginPath(); mctx.arc(x, y, state.brushSize / 2, 0, Math.PI * 2); mctx.fill(); mctx.restore();
  invalidateWarpCache(); drawPaintMask();
}

export function initializePaintControls() {
  canvas.addEventListener("pointerdown", (event) => {
    if (!state.image) return;
    state.isDrawing = true; canvas.setPointerCapture(event.pointerId); savePaintState();
    const point = pointerPosition(event); paintAt(point.x, point.y);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!state.isDrawing) return;
    const point = pointerPosition(event); paintAt(point.x, point.y);
  });
  ["pointerup", "pointercancel"].forEach((type) => canvas.addEventListener(type, () => { state.isDrawing = false; }));
  $("#brushSize").oninput = (event) => { state.brushSize = +event.target.value; $("#brushOutput").textContent = state.brushSize; };
  $("#brushButton").onclick = () => setPaintTool("brush");
  $("#eraseButton").onclick = () => setPaintTool("erase");
  $("#paintIntensity").onclick = (event) => {
    if (!event.target.dataset.v) return;
    state.paintIntensity = +event.target.dataset.v;
    $$("#paintIntensity button").forEach((button) => button.classList.toggle("active", button === event.target));
  };
  $("#undoButton").onclick = () => { if (state.history.length) { state.redo.push(mctx.getImageData(0, 0, mask.width, mask.height)); restorePaintState(state.history.pop()); } };
  $("#redoButton").onclick = () => { if (state.redo.length) { state.history.push(mctx.getImageData(0, 0, mask.width, mask.height)); restorePaintState(state.redo.pop()); } };
  $("#clearButton").onclick = () => applyMaskChange(() => mctx.clearRect(0, 0, mask.width, mask.height));
  $("#fillButton").onclick = () => applyMaskChange(() => { mctx.globalAlpha = 1; mctx.fillStyle = "#fff"; mctx.fillRect(0, 0, mask.width, mask.height); });
  $("#invertButton").onclick = () => applyMaskChange(() => { const data = mctx.getImageData(0, 0, mask.width, mask.height); for (let i = 0; i < data.data.length; i += 4) data.data[i + 3] = 255 - data.data[i + 3]; mctx.putImageData(data, 0, 0); });
  updateHistoryButtons();
}
function setPaintTool(tool) { state.paintTool = tool; $("#brushButton").classList.toggle("active", tool === "brush"); $("#eraseButton").classList.toggle("active", tool === "erase"); }
function applyMaskChange(change) { savePaintState(); change(); invalidateWarpCache(); drawPaintMask(); }
export function resetPaintHistory() { state.history = []; state.redo = []; updateHistoryButtons(); }
