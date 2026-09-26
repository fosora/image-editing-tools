/* =========================================================
   UI CONTROLS, CLEAR AND EXPORT
========================================================= */

clearButton.addEventListener("click", () => {
    if (!image) return;

    maskCtx.clearRect(
        0,
        0,
        maskCanvas.width,
        maskCanvas.height
    );

    render();
});

downloadButton.addEventListener(
    "click",
    () => {
        if (!image) {
            alert("Open an image first.");
            return;
        }

        canvas.toBlob(blob => {
            const url =
                URL.createObjectURL(blob);

            const link =
                document.createElement("a");

            link.href = url;
            link.download =
                "pixelated-blur-image.png";

            document.body.appendChild(link);

            link.click();
            link.remove();

            URL.revokeObjectURL(url);
        }, "image/png");
    }
);
