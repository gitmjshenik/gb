// Копирует web-ассеты в папку www/ для Capacitor
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dest = path.join(root, "www");

const filesToCopy = [
  "index.html",
  "app.js",
  "styles.css",
  "manifest.webmanifest",
  "sw.js",
  "icon.svg",
];

if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

for (const file of filesToCopy) {
  const src = path.join(root, file);
  if (!fs.existsSync(src)) {
    console.warn(`[skip] ${file} не найден`);
    continue;
  }
  fs.copyFileSync(src, path.join(dest, file));
  console.log(`[copy] ${file}`);
}

console.log("Готово. Web-ассеты в www/");