const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SRC = path.join(
  process.env.USERPROFILE,
  ".cursor/projects/c-Users-mdsub-Desktop-Cursor-Wedding-Invitation-Copy/assets"
);
const DEST = path.join(__dirname, "..", "assets", "images", "watercolor");

const FILES = [
  ["groom-afzal.jpg", "groom.png"],
  ["bride-shahin.jpg", "bride.png"],
  ["couple-hero.jpg", "couple.png"],
  ["event-milad.jpg", "event-milad.png"],
  ["event-madwa.jpg", "event-madwa.png"],
  ["event-barat.jpg", "event-barat.png"],
  ["event-nikaah.jpg", "event-nikaah.png"],
  ["event-return-barat.jpg", "event-return-barat.png"],
  ["event-walima.jpg", "event-walima.png"],
  ["reception-walima.jpg", "reception.png"],
  ["closing-floral.jpg", "closing.png"],
  ["floral-accent.jpg", "floral-accent.png"],
  ["wax-seal-as.jpg", "wax-seal.png"]
];

const REF = path.join(__dirname, "..", "assets", "images", "watercolor");

async function cutout(inputPath, outputPath, opts = {}) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const threshold = opts.threshold ?? 232;
  const soft = opts.soft ?? 18;
  const corners = [
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1]
  ];
  const samples = corners.map(([x, y]) => {
    const i = (y * info.width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  });
  const bg = samples
    .reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0])
    .map((v) => v / samples.length);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = Math.sqrt(
      (r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2
    );
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    let alpha = 255;
    if (luma >= threshold || dist < soft) {
      const t = Math.max(luma - (threshold - soft), 0);
      const byLuma = 255 - Math.min(255, (t / soft) * 255);
      const byDist = Math.min(255, (dist / soft) * 255);
      alpha = Math.min(byLuma, byDist);
    }
    data[i + 3] = alpha;
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
    .png()
    .toFile(outputPath);
}

async function main() {
  fs.mkdirSync(DEST, { recursive: true });
  for (const [srcName, destName] of FILES) {
    const input = path.join(SRC, srcName);
    const output = path.join(DEST, destName);
    if (!fs.existsSync(input)) {
      console.warn("missing", input);
      continue;
    }
    await cutout(input, output);
    console.log("wrote", destName);
  }

  // Process uploaded mehndi reference too
  const mehndiRef = path.join(REF, "ref-mehndi.png");
  if (fs.existsSync(mehndiRef)) {
    await cutout(mehndiRef, path.join(DEST, "mehndi-objects.png"), {
      threshold: 238,
      soft: 16
    });
    console.log("wrote mehndi-objects.png");
  }

  // Prefer already-transparent couple if quality is better; keep generated too
  const legacyCouple = path.join(__dirname, "..", "assets", "images", "couple-watercolor.png");
  if (fs.existsSync(legacyCouple)) {
    await sharp(legacyCouple).png().toFile(path.join(DEST, "couple-legacy.png"));
    console.log("copied couple-legacy.png");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
