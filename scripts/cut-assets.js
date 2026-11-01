const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SRC = path.join(
  process.env.USERPROFILE,
  ".cursor/projects/c-Users-mdsub-Desktop-Cursor-Wedding-Invitation-Copy/assets"
);
const DEST = path.join(__dirname, "..", "assets", "images", "watercolor");

const JOBS = [
  ["bride-cutout.jpg", "bride.png", 24],
  ["flora-cutout.jpg", "floral-accent.png", 30],
  ["islamic-milad.jpg", "event-milad.png", 26],
  ["islamic-madwa.jpg", "event-madwa.png", 26],
  ["islamic-barat.jpg", "event-barat.png", 26],
  ["islamic-return.jpg", "event-return-barat.png", 26],
  ["islamic-walima.jpg", "reception.png", 26],
  ["islamic-walima.jpg", "event-walima.png", 26],
  ["groom-afzal.jpg", "groom.png", 24],
  ["closing-floral.jpg", "closing.png", 28]
];

async function floodCut(inputPath, outputPath, tol = 26) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const idx = (x, y) => (y * w + x) * 4;

  const samples = [
    [1, 1],
    [w - 2, 1],
    [1, h - 2],
    [w - 2, h - 2],
    [Math.floor(w / 2), 1],
    [1, Math.floor(h / 2)],
    [w - 2, Math.floor(h / 2)],
    [Math.floor(w / 2), h - 2]
  ];

  const bg = samples
    .map(([x, y]) => {
      const i = idx(x, y);
      return [data[i], data[i + 1], data[i + 2]];
    })
    .reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0])
    .map((v) => v / samples.length);

  const near = (i, t = tol) =>
    Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]) < t;

  const visited = new Uint8Array(w * h);
  const q = [];

  for (let x = 0; x < w; x += 1) {
    for (const y of [0, h - 1]) {
      visited[y * w + x] = 1;
      q.push([x, y]);
    }
  }
  for (let y = 0; y < h; y += 1) {
    for (const x of [0, w - 1]) {
      visited[y * w + x] = 1;
      q.push([x, y]);
    }
  }

  let qi = 0;
  while (qi < q.length) {
    const [x, y] = q[qi++];
    const i = idx(x, y);
    if (!near(i, tol + 4)) continue;
    data[i + 3] = 0;
    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1]
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const k = ny * w + nx;
      if (visited[k]) continue;
      visited[k] = 1;
      q.push([nx, ny]);
    }
  }

  // Soft feather near-bg fringe
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const d = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
    if (d < tol * 1.5) {
      data[i + 3] = Math.round(255 * Math.min(1, d / (tol * 1.5)));
    }
  }

  // Trim transparent bounds
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 8 })
    .png()
    .toFile(outputPath);
}

async function main() {
  fs.mkdirSync(DEST, { recursive: true });
  for (const [src, dest, tol] of JOBS) {
    const input = path.join(SRC, src);
    if (!fs.existsSync(input)) {
      console.warn("missing", src);
      continue;
    }
    const output = path.join(DEST, dest);
    await floodCut(input, output, tol);
    console.log("cut", dest);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
