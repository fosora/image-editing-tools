/* =========================================================
   APPLICATION INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    brushValue.textContent =
        brushSize.value + " px";

    pixelValue.textContent =
        pixelSize.value;

    updateZoomDisplay();
    updateBrushIndicatorSize();
});
