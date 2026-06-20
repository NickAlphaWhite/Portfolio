/**
 * Extract thumbnail images from source URLs.
 * For items without real images, fetches each article page and grabs the og:image or first large image.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fetchHTML } from "./src/utils.js";
import * as cheerio from "cheerio";

const DATA_PATH = path.resolve(import.meta.dirname, "../src/content/items/data.json");

interface Item {
  id: string;
  source: string;
  source_url: string;
  thumbnail: string;
  title_en: string;
}

async function extractThumbnail(url: string): Promise<string> {
  try {
    const html = await fetchHTML(url, 10000);
    const $ = cheerio.load(html);

    // Try OpenGraph image first
    const og = $('meta[property="og:image"]').attr("content") || "";
    if (og && og.startsWith("http")) return og;

    // Try twitter image
    const tw = $('meta[name="twitter:image"]').attr("content") || "";
    if (tw && tw.startsWith("http")) return tw;

    // Try first large image
    let bestImg = "";
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || "";
      if (!src || src.includes("logo") || src.includes("icon") || src.includes("avatar")) return;
      if (src.includes("placeholder") || src.includes("1x1") || src.includes("pixel")) return;
      const w = parseInt($(el).attr("width") || "0");
      const h = parseInt($(el).attr("height") || "0");
      if (w > 200 || h > 200 || (!w && !h && src.length > 10)) {
        const full = src.startsWith("http") ? src
          : src.startsWith("//") ? `https:${src}`
          : "";
        if (full && !bestImg) bestImg = full;
      }
    });

    return bestImg;
  } catch {
    return "";
  }
}

async function main(): Promise<void> {
  const items: Item[] = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

  // Find items without real images (non-RCA items have placeholder SVGs)
  const needThumbnails = items.filter(
    (i) => i.thumbnail && !i.thumbnail.startsWith("http") && i.source_url
  );

  console.log(`Items needing thumbnails: ${needThumbnails.length}\n`);

  let updated = 0;
  let failed = 0;

  for (const item of needThumbnails) {
    console.log(`  ${item.source}: ${item.title_en.slice(0, 50)}`);
    const img = await extractThumbnail(item.source_url);
    if (img) {
      item.thumbnail = img;
      // Also set first image in images array
      const fullItem = items.find((i) => i.id === item.id);
      if (fullItem && (!fullItem.images || fullItem.images.length === 0)) {
        (fullItem as any).images = [img];
      }
      console.log(`    ✅ ${img.slice(0, 80)}`);
      updated++;
    } else {
      console.log(`    ❌ No image found`);
      failed++;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
  console.log(`\nDone: ${updated} updated, ${failed} failed`);
}

main();
