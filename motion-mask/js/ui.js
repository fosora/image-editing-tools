import { $, $$, state, activeLayer, addLayer, removeActiveLayer, exportSettings, animationPresets, invalidateWarpCache } from "./state.js";
import { drawPaintMask, refreshPaintControls, hideBrushCursor } from "./paint.js";
import { renderAnimationFrame } from "./animation.js";
import { exportWebM, exportGIF, exportVideoMP4 } from "./export.js";

export function setStep(step) {
  if (!state.image && step > 1) step = 1;
  state.currentStep = step; $$(".step").forEach((button) => button.classList.toggle("active", +button.dataset.step === step));
  $("#paintPanel").hidden = step !== 1; $("#animationPanel").hidden = step !== 2; $("#exportPanel").hidden = step !== 3;
  $("#modeTitle").textContent = step === 1 ? "Paint" : step === 2 ? "Animation" : "Export";
  $("#hint").textContent = step === 1 ? "Select a layer, then paint only the parts you want to move." : step === 2 ? "Each layer has its own motion settings." : "Review the animation and export the result.";
  if (step === 1) drawPaintMask(); else hideBrushCursor(); if (step === 2) { state.isPlaying = true; $("#playButton").textContent = "⏸ Pause"; renderAnimationFrame(performance.now()); }
}
function renderLayers() {
  $("#layerList").innerHTML = state.layers.map((_, index) => `<button class="layerItem ${index === state.activeLayerIndex ? "active" : ""}" data-layer="${index}"><span>Layer ${index + 1}</span><small>${index === state.activeLayerIndex ? "Selected" : "Select"}</small></button>`).join("");
  $("#deleteLayerButton").disabled = state.layers.length === 1;
}
function syncLayerSettings() {
  const settings = activeLayer().settings;
  [ ["motionAmount", "force", "motionOutput"], ["elasticity", "elasticity", "elasticityOutput"], ["stability", "stability", "stabilityOutput"], ["cohesion", "cohesion", "cohesionOutput"], ["gravity", "gravity", "gravityOutput"], ["gravityAngle", "gravityAngle", "gravityAngleOutput"], ["cycle", "cycle", "cycleOutput"] ].forEach(([id, key, output]) => { $("#" + id).value = settings[key]; $("#" + output).textContent = key === "gravityAngle" ? settings[key] + "°" : key === "cycle" ? settings[key].toFixed(1) + " s" : settings[key]; });
  $$(".preset").forEach((button) => button.classList.toggle("active", button.dataset.p === settings.preset));
  $$("#movementDirection button").forEach((button) => button.classList.toggle("active", button.dataset.v === settings.direction));
}
function bindRangeControl(id, key, output, format = (value) => value) { $("#" + id).oninput = (event) => { activeLayer().settings[key] = +event.target.value; $("#" + output).textContent = format(+event.target.value); invalidateWarpCache(); }; }
function exportAnimation() { return exportSettings.format === "webm" ? exportWebM() : exportSettings.format === "gif" ? exportGIF() : exportVideoMP4(); }
export function initializeUi() {
  $$(".step").forEach((button) => button.onclick = () => setStep(+button.dataset.step));
  $("#toAnimation").onclick = () => setStep(2); $("#backToPaint").onclick = () => setStep(1); $("#toExport").onclick = () => setStep(3); $("#backToAnimation").onclick = () => setStep(2);
  $("#addLayerButton").onclick = () => { addLayer(); invalidateWarpCache(); renderLayers(); refreshPaintControls(); syncLayerSettings(); };
  $("#deleteLayerButton").onclick = () => { if (removeActiveLayer()) { invalidateWarpCache(); renderLayers(); refreshPaintControls(); syncLayerSettings(); } };
  $("#layerList").onclick = (event) => { const button = event.target.closest("[data-layer]"); if (!button) return; state.activeLayerIndex = +button.dataset.layer; renderLayers(); refreshPaintControls(); syncLayerSettings(); };
  $("#animationPresets").innerHTML = Object.entries(animationPresets).map(([key, preset]) => `<button class="preset ${key === "jelly" ? "active" : ""}" data-p="${key}"><strong>${preset.name}</strong><small>${preset.desc}</small></button>`).join("");
  $("#animationPresets").onclick = (event) => { const button = event.target.closest("[data-p]"); if (button) { activeLayer().settings.preset = button.dataset.p; syncLayerSettings(); invalidateWarpCache(); } };
  bindRangeControl("motionAmount", "force", "motionOutput"); bindRangeControl("elasticity", "elasticity", "elasticityOutput"); bindRangeControl("stability", "stability", "stabilityOutput"); bindRangeControl("cohesion", "cohesion", "cohesionOutput"); bindRangeControl("gravity", "gravity", "gravityOutput"); bindRangeControl("gravityAngle", "gravityAngle", "gravityAngleOutput", (value) => value + "°"); bindRangeControl("cycle", "cycle", "cycleOutput", (value) => value.toFixed(1) + " s");
  $("#movementDirection").onclick = (event) => { if (event.target.dataset.v) { activeLayer().settings.direction = event.target.dataset.v; syncLayerSettings(); invalidateWarpCache(); } };
  // Export options are global, unlike motion options which belong to the selected layer.
  ["fps", "quality"].forEach((id) => $("#" + id).oninput = (event) => { exportSettings[id] = +event.target.value; $("#" + id + "Output").textContent = exportSettings[id]; });
  $$(".exportgrid button").forEach((button) => button.onclick = () => { exportSettings.format = button.dataset.format; $$(".exportgrid button").forEach((item) => item.classList.toggle("active", item === button)); });
  $("#playButton").onclick = () => { state.isPlaying = !state.isPlaying; $("#playButton").textContent = state.isPlaying ? "⏸ Pause" : "▶ Play"; if (!state.isPlaying && state.currentStep === 2) drawPaintMask(); };
  window.addEventListener("keydown", (event) => { if (event.code === "Space" && state.image && state.currentStep === 2) { event.preventDefault(); $("#playButton").click(); } });
  $("#resetButton").onclick = () => { if (confirm("Start a new image?")) location.reload(); };
  $("#exportButton").onclick = async () => { if (!state.image) return; const status = $("#exportStatus"); status.textContent = "Rendering…"; try { const blob = await exportAnimation(), link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "motion-mask." + exportSettings.format; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 2000); status.textContent = "Exported locally successfully."; } catch (error) { status.textContent = error.message || "Could not export."; } };
  document.addEventListener("image-loaded", () => { renderLayers(); syncLayerSettings(); setStep(1); }); renderLayers(); syncLayerSettings(); setStep(1);
}
