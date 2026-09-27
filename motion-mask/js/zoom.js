import { $, canvas, state } from "./state.js";
import { hideBrushCursor, updateBrushCursorSize } from "./paint.js";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;

function updateZoomDisplay() {
  $("#zoomOutput").textContent = `${Math.round(state.zoom * 100)}%`;
}

function applyZoom() {
  canvas.style.width = `${canvas.width * state.zoom}px`;
  canvas.style.height = `${canvas.height * state.zoom}px`;
  updateZoomDisplay();
  updateBrushCursorSize();
}

export function setZoom(nextZoom, clientX, clientY) {
  if (!state.image) return;

  const previousZoom = state.zoom;
  state.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
  if (state.zoom === previousZoom) return;

  const canvasBounds = canvas.getBoundingClientRect();
  const pointerX = clientX ?? canvasBounds.left + canvasBounds.width / 2;
  const pointerY = clientY ?? canvasBounds.top + canvasBounds.height / 2;
  const imageX = (pointerX - canvasBounds.left) / previousZoom;
  const imageY = (pointerY - canvasBounds.top) / previousZoom;
  const container = $("#canvasContainer");

  applyZoom();
  requestAnimationFrame(() => {
    const updatedBounds = canvas.getBoundingClientRect();
    container.scrollLeft += updatedBounds.left + imageX * state.zoom - pointerX;
    container.scrollTop += updatedBounds.top + imageY * state.zoom - pointerY;
  });
}

export function resetZoom() {
  state.zoom = 1;
  canvas.style.width = "";
  canvas.style.height = "";
  updateZoomDisplay();
  updateBrushCursorSize();
}

export function initializeZoomControls() {
  $("#zoomInButton").onclick = () => setZoom(state.zoom * ZOOM_STEP);
  $("#zoomOutButton").onclick = () => setZoom(state.zoom / ZOOM_STEP);
  $("#zoomFitButton").onclick = () => {
    resetZoom();
    $("#canvasContainer").scrollTo({ left: 0, top: 0 });
  };

  $("#canvasContainer").addEventListener("wheel", (event) => {
    if (!event.ctrlKey || !state.image) return;
    event.preventDefault();
    setZoom(state.zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15), event.clientX, event.clientY);
  }, { passive: false });

  window.addEventListener("keydown", (event) => {
    if (!state.image || !(event.ctrlKey || event.metaKey)) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom(state.zoom * ZOOM_STEP);
    } else if (event.key === "-") {
      event.preventDefault();
      setZoom(state.zoom / ZOOM_STEP);
    } else if (event.key === "0") {
      event.preventDefault();
      $("#zoomFitButton").click();
    }
  });

  document.addEventListener("image-loaded", () => {
    resetZoom();
    hideBrushCursor();
  });
}
