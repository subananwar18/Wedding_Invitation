const path = require("path");
const sharp = require("sharp");

const GEN = path.join(
  process.env.USERPROFILE,
  ".cursor/projects/c-Users-mdsub-Desktop-Cursor-Wedding-Invitation-Copy/assets"
);
const OUT = path.join(__dirname, "..", "assets", "images", "watercolor");

const JOBS = [
  ["islamic-milad.jpg", "event-milad.png"],
  ["islamic-madwa.jpg", "event-madwa.png"],
  ["islamic-barat.jpg", "event-barat.png"],
  ["islamic-return.jpg", "event-return-barat.png"],
  ["islamic-walima.jpg", "reception.png"],
  ["islamic-nikaah.jpg", "event-nikaah.png"],
  ["bride-cutout.jpg", "bride.png"],
  ["flora-cutout.jpg", "floral-accent.png"],
  ["groom-afzal.jpg", "groom.png"],
  ["closing-floral.jpg", "closing.png"]
];

async function strip(srcName, destName) {
  const input = path.join(GEN, srcName);
  const output = path.join(OUT, destName);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const idx = (x, y) => (y * w + x) * 4;
  const tol = 40;

  const samples = [];
  for (let x = 0; x < w; x += 16) {
    samples.push(idx(x, 0), idx(x, h - 1));
  }
  for (let y = 0; y < h; y += 16) {
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

  const dist = (i) => Math.hypot(data[i] - br, data[i + 1] - bg, data[i + 2] - bb);
  const isPaper = (i) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const c = Math.max(r, g, b) - Math.min(r, g, b);
    return luma > 210 && c < 35;
  };

  const visited = new Uint8Array(w * h);
  const q = [];
  for (let x = 0; x < w; x += 1) {
    visited[x] = 1;
    visited[(h - 1) * w + x] = 1;
    q.push(x, (h - 1) * w + x);
  }
  for (let y = 0; y < h; y += 1) {
    visited[y * w] = 1;
    visited[y * w + w - 1] = 1;
    q.push(y * w, y * w + w - 1);
  }

  let qi = 0;
  while (qi < q.length) {
    const k = q[qi++];
    const x = k % w;
    const y = (k - x) / w;
    const i = k * 4;
    if (!(dist(i) < tol || isPaper(i))) continue;
    data[i + 3] = 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const kk = yy * w + xx;
      if (visited[kk]) continue;
      visited[kk] = 1;
      q.push(kk);
    }
  }

  // Peel white sticker rim (high-luma fringe next to transparency)
  for (let pass = 0; pass < 12; pass += 1) {
    const copy = Buffer.from(data);
    let changed = 0;
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const i = idx(x, y);
        if (copy[i + 3] < 10) continue;
        let t = 0;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ]) {
          if (copy[idx(x + dx, y + dy) + 3] < 12) t += 1;
        }
        if (!t) continue;
        const luma =
          0.299 * copy[i] + 0.587 * copy[i + 1] + 0.114 * copy[i + 2];
        const c =
          Math.max(copy[i], copy[i + 1], copy[i + 2]) -
          Math.min(copy[i], copy[i + 1], copy[i + 2]);
        if (t >= 1 && luma > 220 && c < 40) {
          data[i + 3] = 0;
          changed += 1;
        } else if (t >= 2 && luma > 205 && c < 50) {
          data[i + 3] = 0;
          changed += 1;
        } else if (t >= 1 && dist(i) < tol * 1.3) {
          data[i + 3] = 0;
          changed += 1;
        }
      }
    }
    if (!changed) break;
  }

  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 3 })
    .png()
    .toFile(output);
  console.log("stripped", destName);
}

async function main() {
  for (const [src, dest] of JOBS) {
    await strip(src, dest);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
