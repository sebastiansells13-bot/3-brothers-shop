#!/usr/bin/env node
// Post-build image optimization for CI. Runs after `npm run build` has
// already copied original images into docs/img — converts JPG/PNG that are
// actually referenced in the built HTML to WebP and rewrites the references.
//
// Kept deliberately simple (images only) compared to a full media pipeline
// with video transcoding — add that only once a client site actually needs it.
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUTPUT_DIR = "docs";
const IMG_EXT = /\.(jpe?g|png)$/i;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

async function main() {
  const outputStat = await stat(OUTPUT_DIR).catch(() => null);
  if (!outputStat) {
    console.log(`[optimize-media] ${OUTPUT_DIR}/ not found — run \`npm run build\` first. Skipping.`);
    return;
  }

  const allFiles = await walk(OUTPUT_DIR);
  const htmlFiles = allFiles.filter((f) => f.endsWith(".html"));
  const imageFiles = allFiles.filter((f) => IMG_EXT.test(f));

  if (imageFiles.length === 0) {
    console.log("[optimize-media] No JPG/PNG images found. Nothing to do.");
    return;
  }

  let converted = 0;
  for (const imgPath of imageFiles) {
    const webpPath = imgPath.replace(IMG_EXT, ".webp");
    try {
      await sharp(imgPath).webp({ quality: 82 }).toFile(webpPath);
      converted++;
    } catch (err) {
      console.warn(`[optimize-media] Skipped ${imgPath}: ${err.message}`);
    }
  }

  // Rewrite HTML references from .jpg/.png to .webp for images we converted.
  for (const htmlPath of htmlFiles) {
    let html = await readFile(htmlPath, "utf8");
    const before = html;
    html = html.replace(/(["'])([^"'<>]+?)\.(jpe?g|png)\1/gi, (match, quote, base, ext) => {
      return `${quote}${base}.webp${quote}`;
    });
    if (html !== before) {
      await writeFile(htmlPath, html, "utf8");
    }
  }

  console.log(`[optimize-media] Converted ${converted}/${imageFiles.length} image(s) to WebP.`);
}

main().catch((err) => {
  console.error("[optimize-media] Failed:", err);
  process.exit(1);
});
