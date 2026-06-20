/**
 * Image downloader.
 *
 * Downloads real images from scraped URLs and saves them locally.
 * Run after scraping to replace placeholder SVGs with real images.
 *
 * Usage: npx tsx src/download-images.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";

const DATA_PATH = path.resolve(
  import.meta.dirname,
  "../../src/content/items/data.json"
);
const IMAGES_DIR = path.resolve(
  import.meta.dirname,
  "../../public/images/items"
);

interface PortfolioItem {
  id: string;
  thumbnail: string;
  images: string[];
}

/**
 * Download a single image to the local filesystem.
 */
async function downloadImage(url: string, destPath: string): Promise<boolean> {
  try {
    // Skip non-HTTP URLs (placeholder SVGs)
    if (!url.startsWith("http")) return false;
    // Skip if already downloaded (and is a real image, not SVG placeholder)
    if (fs.existsSync(destPath)) {
      const stat = fs.statSync(destPath);
      if (stat.size > 1000) return true; // already have real image
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return false;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return false; // too small, probably error

    const ext = url.match(/\.(jpg|jpeg|png|webp|gif)/i)?.[1] || "jpg";
    const finalPath = destPath.replace(/\.\w+$/, `.${ext}`);
    fs.writeFileSync(finalPath, buffer);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  if (!fs.existsSync(DATA_PATH)) {
    console.error("data.json not found");
    process.exit(1);
  }

  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const items: PortfolioItem[] = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

  console.log(`Downloading images for ${items.length} items...\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    // Download main thumbnail
    if (item.thumbnail && item.thumbnail.startsWith("http")) {
      const destPath = path.join(IMAGES_DIR, `${item.id}.jpg`);
      const ok = await downloadImage(item.thumbnail, destPath);
      if (ok) downloaded++;
      else if (fs.existsSync(destPath)) skipped++;
      else failed++;
    }

    // Download additional images
    for (let i = 0; i < item.images.length; i++) {
      if (item.images[i] && item.images[i].startsWith("http")) {
        const destPath = path.join(IMAGES_DIR, `${item.id}_${i + 1}.jpg`);
        await downloadImage(item.images[i], destPath);
      }
    }

    if ((downloaded + skipped + failed) % 50 === 0) {
      console.log(`  Progress: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
    }

    // Be polite to servers
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\nDone! ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
}

main();
