import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const requireFromWeb = createRequire(path.join(repo, "apps/web/package.json"));
const { chromium } = requireFromWeb("@playwright/test");

const FPS = 24;
const DURATION = 24;
const TOTAL = FPS * DURATION;
const framesDir = path.join(here, "frames");
const outDir = path.join(here, "dist");

fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files", "--font-render-hinting=none"],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", (error) => console.error("PAGE ERROR:", error.message));
page.on("console", (message) => {
  if (message.type() === "error") console.error("CONSOLE:", message.text());
});
await page.goto(pathToFileURL(path.join(here, "index.html")).href, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready.then(() => true));
await page.waitForFunction(() => Boolean(window.__timelines && window.__timelines.main));
await page.evaluate(() => {
  window.__timelines.main.pause(0);
  return true;
});

const preview = process.env.PREVIEW_FRAMES;
const indices = preview
  ? preview.split(",").map((value) => Number(value.trim()))
  : Array.from({ length: TOTAL }, (_, i) => i);

for (const i of indices) {
  await page.evaluate((t) => {
    window.__timelines.main.time(t);
    return true;
  }, i / FPS);
  await page.screenshot({ path: path.join(framesDir, `frame-${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 92 });
}
await browser.close();

if (preview) {
  console.log(`Preview frames written to ${framesDir}`);
  process.exit(0);
}

const out = path.join(outDir, "cravfted-promo.mp4");
const ffmpeg = spawnSync("ffmpeg", [
  "-y", "-loglevel", "error",
  "-framerate", String(FPS),
  "-i", path.join(framesDir, "frame-%04d.jpg"),
  "-c:v", "libx264", "-preset", "medium", "-crf", "18",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  out,
], { stdio: "inherit" });

if (ffmpeg.status !== 0) process.exit(ffmpeg.status || 1);
console.log(`Rendered ${TOTAL} frames → ${out}`);
