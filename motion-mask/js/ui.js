import { $, $$, state, animationSettings, animationPresets, invalidateWarpCache } from "./state.js";
import { drawPaintMask } from "./paint.js";
import { renderAnimationFrame } from "./animation.js";
import { exportWebM, exportGIF, exportVideoMP4 } from "./export.js";

export function setStep(step) {
  if (!state.image && step > 1) step = 1;
  state.currentStep = step;
  $$(".step").forEach((button) => button.classList.toggle("active", +button.dataset.step === step));
  $("#paintPanel").hidden = step !== 1; $("#animationPanel").hidden = step !== 2; $("#exportPanel").hidden = step !== 3;
  $("#modeTitle").textContent = step === 1 ? "Paint" : step === 2 ? "Animation" : "Export";
  $("#hint").textContent = step === 1 ? "Paint only the parts you want to move." : step === 2 ? "The painted area will be animated; the original image remains still." : "Review the animation and export the result.";
  if (step === 1) drawPaintMask();
  if (step === 2) { state.isPlaying = true; $("#playButton").textContent = "⏸ Pause"; renderAnimationFrame(performance.now()); }
}
function bindRangeControl(id, key, output, format = (value) => value) { $("#" + id).oninput = (event) => { animationSettings[key] = +event.target.value; $("#" + output).textContent = format(animationSettings[key]); invalidateWarpCache(); }; }
function exportAnimation() { return animationSettings.format === "webm" ? exportWebM() : animationSettings.format === "gif" ? exportGIF() : exportVideoMP4(); }
export function initializeUi() {
  $$(".step").forEach((button) => button.onclick = () => setStep(+button.dataset.step));
  $("#toAnimation").onclick = () => setStep(2); $("#backToPaint").onclick = () => setStep(1); $("#toExport").onclick = () => setStep(3); $("#backToAnimation").onclick = () => setStep(2);
  $("#animationPresets").innerHTML = Object.entries(animationPresets).map(([key, preset]) => `<button class="preset ${key === "jelly" ? "active" : ""}" data-p="${key}"><strong>${preset.name}</strong><small>${preset.desc}</small></button>`).join("");
  $("#animationPresets").onclick = (event) => { const button = event.target.closest("[data-p]"); if (!button) return; animationSettings.preset = button.dataset.p; $$(".preset").forEach((item) => item.classList.toggle("active", item === button)); invalidateWarpCache(); };
  bindRangeControl("motionAmount", "force", "motionOutput"); bindRangeControl("elasticity", "elasticity", "elasticityOutput"); bindRangeControl("stability", "stability", "stabilityOutput"); bindRangeControl("cohesion", "cohesion", "cohesionOutput"); bindRangeControl("gravity", "gravity", "gravityOutput"); bindRangeControl("gravityAngle", "gravityAngle", "gravityAngleOutput", (value) => value + "°"); bindRangeControl("cycle", "cycle", "cycleOutput", (value) => value.toFixed(1) + " s"); bindRangeControl("fps", "fps", "fpsOutput"); bindRangeControl("quality", "quality", "qualityOutput");
  $("#movementDirection").onclick = (event) => { if (!event.target.dataset.v) return; animationSettings.direction = event.target.dataset.v; $$("#movementDirection button").forEach((button) => button.classList.toggle("active", button === event.target)); };
  $$(".exportgrid button").forEach((button) => button.onclick = () => { animationSettings.format = button.dataset.format; $$(".exportgrid button").forEach((item) => item.classList.toggle("active", item === button)); });
  $("#playButton").onclick = () => { state.isPlaying = !state.isPlaying; $("#playButton").textContent = state.isPlaying ? "⏸ Pause" : "▶ Play"; if (!state.isPlaying && state.currentStep === 2) drawPaintMask(); };
  window.addEventListener("keydown", (event) => { if (event.code === "Space" && state.image && state.currentStep === 2) { event.preventDefault(); $("#playButton").click(); } });
  $("#resetButton").onclick = () => { if (confirm("Start a new image?")) location.reload(); };
  $("#exportButton").onclick = async () => { if (!state.image) return; const status = $("#exportStatus"); status.textContent = "Rendering…"; try { const blob = await exportAnimation(); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "motion-mask." + animationSettings.format; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 2000); status.textContent = "Exported locally successfully."; } catch (error) { status.textContent = error.message || "Could not export."; } };
  document.addEventListener("image-loaded", () => setStep(1)); setStep(1);
}
