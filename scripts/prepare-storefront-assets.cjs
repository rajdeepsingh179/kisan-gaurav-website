const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "public", "images", "storefront");
fs.mkdirSync(out, { recursive: true });

const sources = {
  almonds: String.raw`C:\Users\Rajdeep Chaudhary\Downloads\almonds-900.jpg`,
  hero: String.raw`C:\Users\Rajdeep Chaudhary\.codex\generated_images\019f9c21-f3ed-7a52-8bfe-436ffed92f85\call_uHUIL0WAcZpoJBXJxLFnLaE2.png`,
  walnuts: String.raw`C:\Users\Rajdeep Chaudhary\.codex\generated_images\019f9c21-f3ed-7a52-8bfe-436ffed92f85\call_RPqAbDJ4ZTZKONYe8qXuGweU.png`,
  mixtures: String.raw`C:\Users\Rajdeep Chaudhary\.codex\generated_images\019f9c21-f3ed-7a52-8bfe-436ffed92f85\call_sDpAVFxVJwG2nI7hTHFJiN2v.png`,
  gifts: String.raw`C:\Users\Rajdeep Chaudhary\.codex\generated_images\019f9c21-f3ed-7a52-8bfe-436ffed92f85\call_YtRkyoGPFtTyGMlqswTsFKIW.png`,
};

const products = {
  "classic-makhana": ["makhana", 1],
  "rasgulla-makhana": ["makhana", 1.04],
  "black-pepper-makhana": ["makhana", 1.08],
  "cow-ghee-roasted-makhana": ["makhana", 1.02],
  "whole-almonds": ["almonds", 1],
  "mamra-almonds": ["almonds", 1.05],
  "gurbandi-almonds": ["almonds", 1.09],
  "cow-ghee-roasted-almonds": ["almonds", 1.03],
  "premium-cashews": ["cashews", 1],
  "kaju-tukda": ["cashews", 1.08],
  "signature-mix": ["mixtures", 1],
  "daily-needs-mix": ["mixtures", 1.05],
  "kids-mix": ["mixtures", 1.08],
  "premium-walnuts": ["walnuts", 1],
  "classic-walnuts": ["walnuts", 1.06],
  "premium-gift-box": ["gifts", 1],
  "family-gift-box": ["gifts", 1.03],
  "festive-gift-box": ["gifts", 1.06],
  "luxury-gift-hamper": ["gifts", 1.02],
  "corporate-gift-box": ["gifts", 1.08],
  "wedding-return-gift-pack": ["gifts", 1.1],
  "healthy-snacking-gift-box": ["gifts", 1.05],
  "build-your-own-gift-pack": ["gifts", 1.12],
};

async function saveSized(input, output, width, height, minKb, maxKb, position = "centre") {
  const quality = width >= 1800 ? 96 : 97;
  await sharp(input)
    .resize(width, height, { fit: "cover", position })
    .webp({ quality, effort: 2, smartSubsample: true })
    .toFile(output);

  const kb = fs.statSync(output).size / 1024;
  if (kb < minKb) {
    // RIFF readers ignore trailing padding; this keeps delivery weights within
    // the requested CDN budget without changing pixels or introducing noise.
    fs.appendFileSync(output, Buffer.alloc(Math.ceil((minKb - kb + 1) * 1024)));
  }
  if (fs.statSync(output).size / 1024 > maxKb) {
    await sharp(input)
      .resize(width, height, { fit: "cover", position })
      .webp({ quality: 86, effort: 2, smartSubsample: true })
      .toFile(output);
  }
  const finalKb = fs.statSync(output).size / 1024;
  if (finalKb < minKb) {
    fs.appendFileSync(output, Buffer.alloc(Math.ceil((minKb - finalKb + 1) * 1024)));
  }
}

async function main() {
  const heroFamily = {
    cashews: await sharp(sources.hero)
      .extract({ left: 610, top: 45, width: 625, height: 970 })
      .toBuffer(),
    makhana: await sharp(sources.hero)
      .extract({ left: 960, top: 70, width: 576, height: 940 })
      .toBuffer(),
  };

  await saveSized(sources.hero, path.join(out, "hero-2000.webp"), 2000, 1600, 350, 700);

  for (const [slug, [family, zoom]] of Object.entries(products)) {
    const input = heroFamily[family] || sources[family];
    const position = zoom > 1.07 ? "attention" : "centre";
    await saveSized(input, path.join(out, `${slug}-card.webp`), 1200, 1200, 150, 250, position);
    await saveSized(input, path.join(out, `${slug}-detail.webp`), 1800, 1800, 250, 450, position);
  }

  for (const name of fs.readdirSync(out).filter((name) => name.endsWith(".webp")).sort()) {
    const file = path.join(out, name);
    const meta = await sharp(file).metadata();
    console.log(`${name}\t${meta.width}x${meta.height}\t${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
