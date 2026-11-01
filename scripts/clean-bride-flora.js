const path = require("path");
const sharp = require("sharp");

async function cutImage(input, output, tol = 34) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const idx = (x, y) => (y * w + x) * 4;
  const samples = [];
  for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 40))) {
    for (const y of [0, 1, 2, h - 1, h - 2, h - 3]) samples.push(idx(x, y));
  }
  for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 40))) {
    for (const x of [0, 1, 2, w - 1, w - 2, w - 3]) samples.push(idx(x, y));
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
  const dist = (i) =>
    Math.hypot(data[i] - br, data[i + 1] - bg, data[i + 2] - bb);
  const cream = (i) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const c = Math.max(r, g, b) - Math.min(r, g, b);
    return luma > 198 && c < 48;
  };
  const visited = new Uint8Array(w * h);
  const q = [];
  for (let x = 0; x < w; x += 1) {
    for (const y of [0, h - 1]) {
      visited[y * w + x] = 1;
      q.push(y * w + x);
    }
  }
  for (let y = 0; y < h; y += 1) {
    for (const x of [0, w - 1]) {
      visited[y * w + x] = 1;
      q.push(y * w + x);
    }
  }
  let qi = 0;
  while (qi < q.length) {
    const k = q[qi++];
    const x = k % w;
    const y = (k - x) / w;
    const i = k * 4;
    if (!(dist(i) < tol || cream(i))) continue;
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
  for (let pass = 0; pass < 20; pass += 1) {
    const copy = Buffer.from(data);
    let ch = 0;
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const i = idx(x, y);
        if (copy[i + 3] < 8) continue;
        let t = 0;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [-1, -1],
          [1, -1],
          [-1, 1]
        ]) {
          if (copy[idx(x + dx, y + dy) + 3] < 10) t += 1;
        }
        if (!t) continue;
        if (cream(i) || dist(i) < tol * 1.5) {
          data[i + 3] = 0;
          ch += 1;
        } else if (t >= 3 && dist(i) < tol * 2.1) {
          data[i + 3] = 0;
          ch += 1;
        }
      }
    }
    if (!ch) break;
  }
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 2 })
    .png()
    .toFile(output);
  console.log("ok", path.basename(output));
}

async function main() {
  const gen = path.join(
    process.env.USERPROFILE,
    ".cursor/projects/c-Users-mdsub-Desktop-Cursor-Wedding-Invitation-Copy/assets"
  );
  await cutImage(
    path.join(__dirname, "..", "assets/images/watercolor/ref-bride.png"),
    path.join(__dirname, "..", "assets/images/watercolor/bride.png"),
    30
  );
  await cutImage(
    path.join(gen, "flora-cutout.jpg"),
    path.join(__dirname, "..", "assets/images/watercolor/floral-accent.png"),
    42
  );
  await cutImage(
    path.join(gen, "bride-cutout.jpg"),
    path.join(__dirname, "..", "assets/images/watercolor/bride-alt.png"),
    40
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
