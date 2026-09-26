/* =========================================================
   RENDERING AND PIXELATION
========================================================= */

function render() {
    if (!image || !originalCanvas) {
        return;
    }

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.drawImage(
        originalCanvas,
        0,
        0
    );

    const pixelated =
        createPixelatedCanvas(
            Number(pixelSize.value)
        );

    const finalCanvas =
        document.createElement("canvas");

    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;

    const finalCtx =
        finalCanvas.getContext("2d");

    finalCtx.drawImage(
        originalCanvas,
        0,
        0
    );

    finalCtx.drawImage(
        pixelated,
        0,
        0
    );

    const finalData =
        finalCtx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );

    const originalData =
        originalCtx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );

    const maskData =
        maskCtx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );

    for (
        let i = 0;
        i < finalData.data.length;
        i += 4
    ) {
        const alpha =
            maskData.data[i + 3] / 255;

        finalData.data[i] =
            originalData.data[i] *
            (1 - alpha) +
            finalData.data[i] *
            alpha;

        finalData.data[i + 1] =
            originalData.data[i + 1] *
            (1 - alpha) +
            finalData.data[i + 1] *
            alpha;

        finalData.data[i + 2] =
            originalData.data[i + 2] *
            (1 - alpha) +
            finalData.data[i + 2] *
            alpha;

        finalData.data[i + 3] =
            originalData.data[i + 3];
    }

    ctx.putImageData(
        finalData,
        0,
        0
    );
}

function createPixelatedCanvas(blockSize) {
    const result =
        document.createElement("canvas");

    result.width = canvas.width;
    result.height = canvas.height;

    const resultCtx =
        result.getContext("2d");

    const source =
        originalCtx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );

    const output =
        resultCtx.createImageData(
            canvas.width,
            canvas.height
        );

    const data = source.data;
    const out = output.data;

    for (
        let by = 0;
        by < canvas.height;
        by += blockSize
    ) {
        for (
            let bx = 0;
            bx < canvas.width;
            bx += blockSize
        ) {
            let r = 0;
            let g = 0;
            let b = 0;
            let a = 0;
            let count = 0;

            const maxX =
                Math.min(
                    bx + blockSize,
                    canvas.width
                );

            const maxY =
                Math.min(
                    by + blockSize,
                    canvas.height
                );

            for (
                let y = by;
                y < maxY;
                y++
            ) {
                for (
                    let x = bx;
                    x < maxX;
                    x++
                ) {
                    const index =
                        (y * canvas.width + x) * 4;

                    r += data[index];
                    g += data[index + 1];
                    b += data[index + 2];
                    a += data[index + 3];

                    count++;
                }
            }

            r /= count;
            g /= count;
            b /= count;
            a /= count;

            for (
                let y = by;
                y < maxY;
                y++
            ) {
                for (
                    let x = bx;
                    x < maxX;
                    x++
                ) {
                    const index =
                        (y * canvas.width + x) * 4;

                    out[index] = r;
                    out[index + 1] = g;
                    out[index + 2] = b;
                    out[index + 3] = a;
                }
            }
        }
    }

    resultCtx.putImageData(
        output,
        0,
        0
    );

    return result;
}

pixelSize.addEventListener("input", () => {
    pixelValue.textContent = pixelSize.value;

    if (image) {
        render();
    }
});
