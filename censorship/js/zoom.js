/* =========================================================
   ZOOM AND PANNING
========================================================= */

function updateZoomDisplay() {
    zoomValue.textContent =
        Math.round(zoom * 100) + "%";
}

function setZoom(
    newZoom,
    anchorX = null,
    anchorY = null
) {
    if (!image) return;

    const oldZoom = zoom;

    zoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, newZoom)
    );

    const x =
        anchorX ??
        canvasWrapper.clientWidth / 2;

    const y =
        anchorY ??
        canvasWrapper.clientHeight / 2;

    const imageX =
        (
            canvasWrapper.scrollLeft +
            x -
            canvas.offsetLeft
        ) / oldZoom;

    const imageY =
        (
            canvasWrapper.scrollTop +
            y -
            canvas.offsetTop
        ) / oldZoom;

    canvas.style.width =
        canvas.width * zoom + "px";

    canvas.style.height =
        canvas.height * zoom + "px";

    updateZoomDisplay();
    updateBrushIndicatorSize();

    requestAnimationFrame(() => {
        canvasWrapper.scrollLeft =
            Math.max(
                0,
                imageX * zoom +
                canvas.offsetLeft -
                x
            );

        canvasWrapper.scrollTop =
            Math.max(
                0,
                imageY * zoom +
                canvas.offsetTop -
                y
            );
    });
}

function fitCanvas() {
    if (!image) return;

    const maxWidth =
        canvasWrapper.clientWidth - 60;

    const maxHeight =
        canvasWrapper.clientHeight - 60;

    zoom = Math.min(
        1,
        maxWidth / canvas.width,
        maxHeight / canvas.height
    );

    canvas.style.width =
        canvas.width * zoom + "px";

    canvas.style.height =
        canvas.height * zoom + "px";

    updateZoomDisplay();
    updateBrushIndicatorSize();

    requestAnimationFrame(() => {
        canvasWrapper.scrollLeft =
            Math.max(
                0,
                (
                    canvasWrapper.scrollWidth -
                    canvasWrapper.clientWidth
                ) / 2
            );

        canvasWrapper.scrollTop =
            Math.max(
                0,
                (
                    canvasWrapper.scrollHeight -
                    canvasWrapper.clientHeight
                ) / 2
            );
    });
}

zoomInButton.addEventListener("click", () => {
    setZoom(zoom * 1.25);
});

zoomOutButton.addEventListener("click", () => {
    setZoom(zoom / 1.25);
});

fitButton.addEventListener("click", fitCanvas);

canvasWrapper.addEventListener(
    "wheel",
    event => {
        if (!image || !event.ctrlKey) return;

        event.preventDefault();

        const rect =
            canvasWrapper.getBoundingClientRect();

        const x =
            event.clientX - rect.left;

        const y =
            event.clientY - rect.top;

        const factor =
            event.deltaY < 0
                ? 1.15
                : 1 / 1.15;

        setZoom(
            zoom * factor,
            x,
            y
        );
    },
    { passive: false }
);

window.addEventListener("keydown", event => {
    if (
        event.code === "Space" &&
        !event.repeat
    ) {
        spacePressed = true;
        hideBrushIndicator();

        if (!isPanning) {
            canvasWrapper.style.cursor = "grab";
        }
    }

    if (
        (event.ctrlKey || event.metaKey) &&
        (
            event.key === "+" ||
            event.key === "="
        )
    ) {
        event.preventDefault();
        setZoom(zoom * 1.25);
    }

    if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "-"
    ) {
        event.preventDefault();
        setZoom(zoom / 1.25);
    }

    if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "0"
    ) {
        event.preventDefault();
        fitCanvas();
    }
});

window.addEventListener("keyup", event => {
    if (event.code === "Space") {
        spacePressed = false;

        if (!isPanning) {
            canvasWrapper.style.cursor = "default";
        }
    }
});

canvasWrapper.addEventListener(
    "pointerdown",
    event => {
        if (
            !image ||
            (
                !spacePressed &&
                event.button !== 1
            )
        ) {
            return;
        }

        isPanning = true;
        hideBrushIndicator();

        panStartX = event.clientX;
        panStartY = event.clientY;

        scrollStartLeft =
            canvasWrapper.scrollLeft;

        scrollStartTop =
            canvasWrapper.scrollTop;

        canvasWrapper.classList.add("panning");

        canvasWrapper.setPointerCapture(
            event.pointerId
        );

        event.preventDefault();
    }
);

canvasWrapper.addEventListener(
    "pointermove",
    event => {
        if (!isPanning) return;

        canvasWrapper.scrollLeft =
            scrollStartLeft -
            (event.clientX - panStartX);

        canvasWrapper.scrollTop =
            scrollStartTop -
            (event.clientY - panStartY);
    }
);

function stopPanning(event) {
    if (!isPanning) return;

    isPanning = false;

    canvasWrapper.classList.remove(
        "panning"
    );

    try {
        canvasWrapper.releasePointerCapture(
            event.pointerId
        );
    } catch {}
}

canvasWrapper.addEventListener(
    "pointerup",
    stopPanning
);

canvasWrapper.addEventListener(
    "pointercancel",
    stopPanning
);

window.addEventListener(
    "resize",
    fitCanvas
);
