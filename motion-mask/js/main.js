import { initializePaintControls } from "./paint.js";
import { initializeImageControls } from "./image.js";
import { startAnimationLoop } from "./animation.js";
import { initializeUi } from "./ui.js";
import { initializeZoomControls } from "./zoom.js";

initializePaintControls();
initializeImageControls();
initializeUi();
initializeZoomControls();
startAnimationLoop();
