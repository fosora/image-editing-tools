/* =========================================================
   BRUSH AND BRUSH INDICATOR
========================================================= */

function getCanvasPosition(event) {
    const rect = canvas.getBoundingClientRect();

    return {
        x:
            (event.clientX - rect.left) *
            canvas.width /
            rect.width,

        y:
            (event.clientY - rect.top) *
            canvas.height /
            rect.height
    };
}

function updateBrushIndicator(event) {
    if (!image || spacePressed || isPanning) {
        hideBrushIndicator();
        return;
    }

    const rect = canvas.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (
        x < 0 ||
        y < 0 ||
        x > rect.width ||
        y > rect.height
    ) {
        hideBrushIndicator();
        return;
    }

    updateBrushIndicatorSize();

    brushIndicator.style.left =
        (canvas.offsetLeft + x) + "px";

    brushIndicator.style.top =
        (canvas.offsetTop + y) + "px";

    brushIndicator.style.display = "block";
}

function updateBrushIndicatorSize() {
    if (!image) return;

    const size =
        Number(brushSize.value) * zoom;

    brushIndicator.style.width = size + "px";
    brushIndicator.style.height = size + "px";
}

function hideBrushIndicator() {
    brushIndicator.style.display = "none";
}

function drawBrush(context, x, y, radius) {
    const gradient =
        context.createRadialGradient(
            x,
            y,
            radius * 0.65,
            x,
            y,
            radius
        );

    if (
        context.globalCompositeOperation ===
        "destination-out"
    ) {
        gradient.addColorStop(
            0,
            "rgba(0,0,0,1)"
        );

        gradient.addColorStop(
            1,
            "rgba(0,0,0,0)"
        );
    } else {
        gradient.addColorStop(
            0,
            "rgba(255,255,255,1)"
        );

        gradient.addColorStop(
            1,
            "rgba(255,255,255,0)"
        );
    }

    context.fillStyle = gradient;
    context.beginPath();

    context.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );

    context.fill();
}

function paintMask(event) {
    const position = getCanvasPosition(event);
    const radius = Number(brushSize.value) / 2;

    maskCtx.save();

    if (tool.value === "erase") {
        maskCtx.globalCompositeOperation =
            "destination-out";
    } else {
        maskCtx.globalCompositeOperation =
            "source-over";
        maskCtx.fillStyle = "white";
    }

    drawBrush(
        maskCtx,
        position.x,
        position.y,
        radius
    );

    maskCtx.restore();

    render();
}

canvas.addEventListener("pointerdown", event => {
    if (
        !image ||
        spacePressed ||
        event.button !== 0
    ) {
        return;
    }

    drawing = true;

    canvas.setPointerCapture(event.pointerId);

    paintMask(event);
});

canvas.addEventListener("pointermove", event => {
    updateBrushIndicator(event);

    if (!drawing) return;

    paintMask(event);
});

canvas.addEventListener("pointerup", () => {
    drawing = false;
});

canvas.addEventListener("pointercancel", () => {
    drawing = false;
});

canvas.addEventListener(
    "pointerenter",
    updateBrushIndicator
);

canvas.addEventListener(
    "pointerleave",
    hideBrushIndicator
);

brushSize.addEventListener("input", () => {
    brushValue.textContent =
        brushSize.value + " px";

    updateBrushIndicatorSize();
});
