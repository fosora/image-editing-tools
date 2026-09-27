import { $, canvas, ctx, state, resetLayers, invalidateWarpCache } from "./state.js";
import { drawPaintMask, resetPaintHistory } from "./paint.js";

export function fitCanvasToContainer() {
  if (!state.image) return;
  const box = $("#canvasContainer");
  const ratio = Math.min(Math.max(1, box.clientWidth - 20) / state.image.width, Math.max(1, box.clientHeight - 20) / state.image.height, 1);
  const width = Math.max(1, Math.round(state.image.width * ratio));
  const height = Math.max(1, Math.round(state.image.height * ratio));
  const oldMasks = state.layers.map((layer) => {
    const oldMask = document.createElement("canvas"); oldMask.width = layer.mask.width; oldMask.height = layer.mask.height;
    if (oldMask.width && oldMask.height) oldMask.getContext("2d").drawImage(layer.mask, 0, 0);
    return oldMask;
  });
  canvas.width = width; canvas.height = height;
  state.layers.forEach((layer, index) => {
    layer.mask.width = width; layer.mask.height = height;
    if (oldMasks[index].width && oldMasks[index].height) layer.context.drawImage(oldMasks[index], 0, 0, oldMasks[index].width, oldMasks[index].height, 0, 0, width, height);
  });
  invalidateWarpCache(); ctx.drawImage(state.image, 0, 0, width, height); drawPaintMask();
}

export function loadImageFile(file) {
  if (!file || !file.type.match(/^image\/(png|jpeg|webp)$/)) return;
  const url = URL.createObjectURL(file), image = new Image();
  image.onload = () => {
    state.image = image; resetLayers(); invalidateWarpCache(); resetPaintHistory();
    $("#emptyState").classList.add("hidden"); fitCanvasToContainer();
    URL.revokeObjectURL(url); document.dispatchEvent(new CustomEvent("image-loaded"));
  };
  image.src = url;
}
function createSampleImage() {
  const sample = document.createElement("canvas"); sample.width = 800; sample.height = 600;
  const context = sample.getContext("2d"); context.fillStyle = "#e9edf3"; context.fillRect(0, 0, 800, 600);
  context.fillStyle = "#7b61ff"; context.beginPath(); context.arc(400, 300, 150, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#fff"; context.beginPath(); context.arc(350, 270, 20, 0, Math.PI * 2); context.arc(450, 270, 20, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#222"; context.beginPath(); context.arc(350, 270, 9, 0, Math.PI * 2); context.arc(450, 270, 9, 0, Math.PI * 2); context.fill();
  sample.toBlob((blob) => loadImageFile(new File([blob], "sample.png", { type: "image/png" })));
}
export function initializeImageControls() {
  $("#uploadButton").onclick = () => $("#fileInput").click();
  $("#fileInput").onchange = (event) => loadImageFile(event.target.files[0]);
  [$("#dropZone"), $("#canvasContainer")].forEach((element) => { element.addEventListener("dragover", (event) => event.preventDefault()); element.addEventListener("drop", (event) => { event.preventDefault(); loadImageFile(event.dataTransfer.files[0]); }); });
  $("#pasteButton").onclick = async () => { try { const items = await navigator.clipboard.read(); for (const item of items) { const type = item.types.find((value) => value.startsWith("image/")); if (type) { loadImageFile(new File([await item.getType(type)], `pasted.${type.split("/")[1]}`, { type })); return; } } } catch { alert("The browser did not allow clipboard access. Use Ctrl+V."); } };
  window.addEventListener("paste", (event) => { const file = [...event.clipboardData.files].find((item) => item.type.startsWith("image/")); if (file) loadImageFile(file); });
  $("#sampleButton").onclick = createSampleImage;
  $("#fitButton").onclick = fitCanvasToContainer;
  window.addEventListener("resize", fitCanvasToContainer);
}
