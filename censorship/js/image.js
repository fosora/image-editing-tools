/* =========================================================
   IMAGE LOADING, CLIPBOARD AND DRAG & DROP
========================================================= */

function loadFile(file) {
    if (!file.type.startsWith("image/")) {
        alert("Please select a valid image.");
        return;
    }

    const reader = new FileReader();

    reader.onload = event => {
        const img = new Image();

        img.onload = () => {
            image = img;

            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            originalCanvas = document.createElement("canvas");
            originalCanvas.width = img.naturalWidth;
            originalCanvas.height = img.naturalHeight;

            originalCtx = originalCanvas.getContext("2d");
            originalCtx.drawImage(img, 0, 0);

            maskCanvas = document.createElement("canvas");
            maskCanvas.width = img.naturalWidth;
            maskCanvas.height = img.naturalHeight;

            maskCtx = maskCanvas.getContext("2d");
            maskCtx.clearRect(
                0,
                0,
                maskCanvas.width,
                maskCanvas.height
            );

            render();

            canvas.style.display = "block";
            empty.style.display = "none";

            status.textContent =
                `${canvas.width} × ${canvas.height}px`;

            fitCanvas();
        };

        img.src = event.target.result;
    };

    reader.readAsDataURL(file);
}

function handleClipboardImage(blob) {
    if (blob) {
        loadFile(blob);
    }
}

openButton.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", event => {
    const file = event.target.files[0];
    if (file) {
        loadFile(file);
    }
});

pasteButton.addEventListener("click", async () => {
    try {
        const items = await navigator.clipboard.read();

        for (const item of items) {
            const type = item.types.find(type =>
                type.startsWith("image/")
            );

            if (!type) continue;

            const blob = await item.getType(type);
            handleClipboardImage(blob);
            return;
        }

        alert("There is no image in the clipboard.");
    } catch {
        alert("Use Ctrl + V to paste an image.");
    }
});

document.addEventListener("paste", event => {
    const items = event.clipboardData?.items;

    if (!items) return;

    for (const item of items) {
        if (item.type.startsWith("image/")) {
            const file = item.getAsFile();

            if (file) {
                loadFile(file);
            }

            break;
        }
    }
});

workspace.addEventListener("dragover", event => {
    event.preventDefault();
    workspace.classList.add("dragging");
});

workspace.addEventListener("dragleave", () => {
    workspace.classList.remove("dragging");
});

workspace.addEventListener("drop", event => {
    event.preventDefault();
    workspace.classList.remove("dragging");

    const file = event.dataTransfer.files[0];

    if (file) {
        loadFile(file);
    }
});
