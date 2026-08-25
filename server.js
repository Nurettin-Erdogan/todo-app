const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT) || 5500;
const ROOT = __dirname;
const PUBLIC_FILES = new Set([
  "index.html",
  "style.css",
  "script.js",
  "manifest.webmanifest",
  "service-worker.js",
  "icon-192.svg",
  "icon-512.svg",
  "icon-192.png",
  "icon-512.png",
  "docs/screenshots/gorev-listesi.jpg",
]);
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

function createServer() {
  return http.createServer((request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }

    let filePath;
    try {
      const url = new URL(request.url, `http://${request.headers.host || HOST}`);
      const relativePath = decodeURIComponent(url.pathname === "/" ? "index.html" : url.pathname.slice(1));
      filePath = path.resolve(ROOT, relativePath);
    } catch {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Geçersiz istek.");
      return;
    }

    const isInsideProject = filePath.startsWith(`${ROOT}${path.sep}`);
    const publicFile = path.relative(ROOT, filePath).replaceAll("\\", "/");

    if (!isInsideProject || !PUBLIC_FILES.has(publicFile) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Dosya bulunamadı.");
      return;
    }

    response.writeHead(200, {
      "Content-Type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }

    fs.createReadStream(filePath).pipe(response);
  });
}

function startServer({ host = HOST, port = PORT, log = true } = {}) {
  const server = createServer();

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.removeListener("error", reject);
      if (log) {
        console.log(`Görev Listesi çalışıyor: http://${host}:${port}`);
        console.log("Durdurmak için Ctrl + C tuşlarına basın.");
      }
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`${PORT} numaralı port başka bir program tarafından kullanılıyor.`);
    } else {
      console.error("Sunucu başlatılamadı:", error.message);
    }
    process.exitCode = 1;
  });
}

module.exports = { createServer, startServer };
