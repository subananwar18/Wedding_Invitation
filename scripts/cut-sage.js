const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const GEN = path.join(
  process.env.USERPROFILE,
  ".cursor/projects/c-Users-mdsub-Desktop-Cursor-Wedding-Invitation-Copy/assets"
);
const OUT = path.join(__dirname, "..", "assets", "images", "watercolor");

const JOBS = [
  ["milad-sage.jpg", "event-milad.png", 30],
  ["madwa-sage.jpg", "event-madwa.png", 30],
  ["barat-sage.jpg", "event-barat.png", 30],
  ["return-sage.jpg", "event-return-barat.png", 30],
  ["walima-sage.jpg", "reception.png", 30],
  ["bride-sage.jpg", "bride.png", 30],
  ["flora-cutout.jpg", "floral-accent.png", 38],
  ["groom-afzal.jpg", "groom.png", 32],
  ["closing-floral.jpg", "closing.png", 34]
];

async function cut(src, dest, tol) {
  const input = path.join(GEN, src);
  if (!fs.existsSync(input)) {
    console.warn("skip", src);
    return;
  }
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const idx = (x, y) => (y * w + x) * 4;
  const samples = [];
  for (let x = 0; x < w; x += 18) {
    samples.push(idx(x, 0), idx(x, h - 1));
  }
  for (let y = 0; y < h; y += 18) {
    samples.push(idx(0, y), idx(w - 1, y));
  }
  let br = 0;
  let bg = 0;
  let bb = 0;
  for (const i of samples) {
    br += data[i];
    bg += data[i + 1];
    bb += data[i + 2];
  }
  br /= samples.length;
  bg /= samples.length;
  bb /= samples.length;
  br = (br + 244) / 2;
  bg = (bg + 247) / 2;
  bb = (bb + 242) / 2;

  const near = (i, t) =>
    Math.hypot(data[i] - br, data[i + 1] - bg, data[i + 2] - bb) < t;
  const visited = new Uint8Array(w * h);
  const q = [];
  for (let x = 0; x < w; x += 1) {
    visited[x] = 1;
    visited[(h - 1) * w + x] = 1;
    q.push([x, 0], [x, h - 1]);
  }
  for (let y = 0; y < h; y += 1) {
    visited[y * w] = 1;
    visited[y * w + w - 1] = 1;
    q.push([0, y], [w - 1, y]);
  }
  let qi = 0;
  while (qi < q.length) {
    const [x, y] = q[qi++];
    const i = idx(x, y);
    if (!near(i, tol)) continue;
    data[i + 3] = 0;
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1]
    ]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const k = ny * w + nx;
      if (visited[k]) continue;
      visited[k] = 1;
      q.push([nx, ny]);
    }
  }
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const d = Math.hypot(data[i] - br, data[i + 1] - bg, data[i + 2] - bb);
    if (d < tol * 1.2) {
      data[i + 3] = Math.round(255 * Math.min(1, d / (tol * 1.2)));
    }
  }
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 3 })
    .png()
    .toFile(path.join(OUT, dest));
  console.log("ok", dest);
}

async function main() {
  for (const [src, dest, tol] of JOBS) {
    await cut(src, dest, tol);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
