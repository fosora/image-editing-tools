/* =========================================================
   APPLICATION STATE AND DOM REFERENCES
========================================================= */

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const workspace = document.getElementById("workspace");
const canvasWrapper = document.querySelector(".canvas-wrapper");

const fileInput = document.getElementById("fileInput");
const openButton = document.getElementById("openButton");
const pasteButton = document.getElementById("pasteButton");

const brushSize = document.getElementById("brushSize");
const pixelSize = document.getElementById("pixelSize");
const brushValue = document.getElementById("brushValue");
const pixelValue = document.getElementById("pixelValue");
const tool = document.getElementById("tool");

const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const clearButton = document.getElementById("clearButton");
const downloadButton = document.getElementById("downloadButton");

const zoomOutButton = document.getElementById("zoomOutButton");
const zoomInButton = document.getElementById("zoomInButton");
const fitButton = document.getElementById("fitButton");
const zoomValue = document.getElementById("zoomValue");

const empty = document.getElementById("empty");
const status = document.getElementById("status");
const brushIndicator = document.getElementById("brushIndicator");

let image = null;
let drawing = false;

let originalCanvas = null;
let originalCtx = null;

let maskCanvas = null;
let maskCtx = null;

let zoom = 1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

let spacePressed = false;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let scrollStartLeft = 0;
let scrollStartTop = 0;
