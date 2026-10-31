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
// Icon files need to stay real PNGs: iOS only accepts PNG for
// apple-touch-icon, and PNG favicons should match their declared
// type="image/png" — so nothing under favicons/ is converted.
const SKIP_DIR = `${path.sep}favicons${path.sep}`;
// Tags whose images must keep their original format: icon links (iOS
// apple-touch-icon is PNG-only) and social preview images (several link
// preview crawlers don't render WebP). Their originals are still published.
const KEEP_ORIGINAL_TAG =
  /^<(?:link\b[^>]*\brel="[^"]*icon[^"]*"|meta\b[^>]*\b(?:property|name)="(?:og:image(?::url|:secure_url)?|twitter:image)")/i;

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
  const imageFiles = allFiles.filter((f) => IMG_EXT.test(f) && !f.includes(SKIP_DIR));

  if (imageFiles.length === 0) {
    console.log("[optimize-media] No JPG/PNG images found. Nothing to do.");
    return;
  }

  // Site-relative paths ("img/hero/a.jpg") of images that now have a WebP copy.
  const converted = new Set();
  for (const imgPath of imageFiles) {
    const webpPath = imgPath.replace(IMG_EXT, ".webp");
    try {
      await sharp(imgPath).webp({ quality: 82 }).toFile(webpPath);
      converted.add(path.relative(OUTPUT_DIR, imgPath).split(path.sep).join("/"));
    } catch (err) {
      console.warn(`[optimize-media] Skipped ${imgPath}: ${err.message}`);
    }
  }

  // Rewrite a .jpg/.png reference to .webp only when it's a local path to an
  // image converted above, and it isn't inside an icon or social-preview tag.
  const rewriteRef = (match, quote, ref) => {
    if (/^(?:[a-z]+:)?\/\//i.test(ref)) return match;
    const local = ref.split(/[?#]/)[0].replace(/^\.?\//, "");
    const isConverted = [...converted].some((rel) => local === rel || local.endsWith(`/${rel}`));
    return isConverted ? `${quote}${ref.replace(/\.(jpe?g|png)(?=$|[?#])/i, ".webp")}${quote}` : match;
  };

  for (const htmlPath of htmlFiles) {
    const before = await readFile(htmlPath, "utf8");
    const html = before.replace(/<[^>]+>/g, (tag) =>
      KEEP_ORIGINAL_TAG.test(tag) ? tag : tag.replace(/(["'])([^"'<>]+?\.(?:jpe?g|png)(?:[?#][^"'<>]*)?)\1/gi, rewriteRef)
    );
    if (html !== before) {
      await writeFile(htmlPath, html, "utf8");
    }
  }

  console.log(`[optimize-media] Converted ${converted.size}/${imageFiles.length} image(s) to WebP.`);
}

main().catch((err) => {
  console.error("[optimize-media] Failed:", err);
  process.exit(1);
});
