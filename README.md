# Image Editing Tools

Image Editing Tools is a local browser application that includes the Censorship Tool and Motion Mask. Images are processed in the browser and are not uploaded to a server.

## Run locally

1. Install a current version of [Node.js](https://nodejs.org/).
2. From the project directory, run:

   ```bash
   npm start
   ```

3. Open [http://127.0.0.1:4173](http://127.0.0.1:4173) in your browser.

The local server uses no third-party dependencies. To use another port or host, set `PORT` and `HOST` before running the command:

```bash
PORT=3000 HOST=127.0.0.1 npm start
```

Do not open `motion-mask/index.html` directly from the filesystem. Motion Mask uses JavaScript modules, which browsers reliably load through a local HTTP server.
