const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { removeBackground } = require("@imgly/background-removal-node");

const GEN = path.join(
  process.env.USERPROFILE,
  ".cursor/projects/c-Users-mdsub-Desktop-Cursor-Wedding-Invitation-Copy/assets"
);
const OUT = path.join(__dirname, "..", "assets", "images", "watercolor");

const JOBS = [
  ["bride-sage.jpg", "bride.png"],
  ["flora-cutout.jpg", "floral-accent.png"],
  ["groom-afzal.jpg", "groom.png"],
  ["milad-sage.jpg", "event-milad.png"],
  ["madwa-sage.jpg", "event-madwa.png"],
  ["barat-sage.jpg", "event-barat.png"],
  ["return-sage.jpg", "event-return-barat.png"],
  ["walima-sage.jpg", "reception.png"],
  ["islamic-nikaah.jpg", "event-nikaah.png"],
  ["closing-floral.jpg", "closing.png"]
];

async function cutOne(src, dest) {
  const input = path.join(GEN, src);
  if (!fs.existsSync(input)) {
    console.warn("skip missing", src);
    return;
  }
  console.log("removing bg:", src);
  const mime = src.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  const blobIn = new Blob([fs.readFileSync(input)], { type: mime });
  const blob = await removeBackground(blobIn, {
    model: "medium",
    output: { format: "image/png", type: "foreground" }
  });
  const buffer = Buffer.from(await blob.arrayBuffer());
  fs.writeFileSync(path.join(OUT, dest), buffer);
  console.log("wrote", dest);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [src, dest] of JOBS) {
    await cutOne(src, dest);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
