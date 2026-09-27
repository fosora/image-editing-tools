import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, normalize, resolve, sep } from "node:path";

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const rootDirectory = resolve(import.meta.dirname, "..");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function getFilePath(requestUrl) {
  const pathname = new URL(requestUrl, `http://${host}`).pathname;
  const relativePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const filePath = normalize(resolve(rootDirectory, relativePath));
  return filePath === rootDirectory || filePath.startsWith(rootDirectory + sep) ? filePath : null;
}

const server = createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  const filePath = getFilePath(request.url || "/");
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream" });
  if (request.method === "HEAD") { response.end(); return; }
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Image Editing Tools is available at http://${host}:${port}`);
});
