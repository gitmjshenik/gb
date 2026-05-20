const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = 8080;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = http.createServer((request, response) => {
  const cleanUrl = decodeURIComponent(request.url.split("?")[0]);
  const requestPath = cleanUrl === "/" ? "index.html" : cleanUrl.replace(/^\/+/, "");
  const filePath = path.resolve(root, requestPath);

  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`WeatherGuru работает: http://localhost:${port}`);
  console.log("Нажмите Ctrl+C, чтобы остановить сервер.");
});
