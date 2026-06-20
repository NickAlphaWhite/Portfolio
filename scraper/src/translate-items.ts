/**
 * Translate all item titles and descriptions from English to Chinese.
 * Uses Google Translate's free endpoint.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const DATA_PATH = path.resolve(import.meta.dirname, "../../src/content/items/data.json");

interface Item {
  id: string;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  author_name_en: string;
  author_name_zh: string;
}

async function translate(text: string): Promise<string> {
  if (!text || text.trim().length < 2) return text;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await res.json() as any;
    // Extract translated text from response
    const translated = data?.[0]?.map((s: any[]) => s[0]).join("") || text;
    return translated;
  } catch {
    return text; // fallback to original
  }
}

async function main(): Promise<void> {
  const items: Item[] = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

  console.log(`Translating ${items.length} items...\n`);

  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    // Skip if already has a proper Chinese translation (different from English)
    const needsTranslation =
      item.title_zh === item.title_en ||
      item.description_zh === item.description_en ||
      !item.title_zh;

    if (!needsTranslation) {
      skipped++;
      continue;
    }

    // Translate title
    if (item.title_en && (item.title_zh === item.title_en || !item.title_zh)) {
      const zh = await translate(item.title_en);
      if (zh !== item.title_en) {
        item.title_zh = zh;
        console.log(`  [${updated + 1}] ${item.title_en.slice(0, 50)} → ${zh.slice(0, 30)}`);
      }
    }

    // Translate description (limit to first 300 chars to avoid rate limits)
    if (item.description_en && (item.description_zh === item.description_en || !item.description_zh)) {
      const shortDesc = item.description_en.slice(0, 300);
      const zh = await translate(shortDesc);
      if (zh !== shortDesc) {
        item.description_zh = zh;
      }
    }

    // Translate author name (simple transliteration might be better, but try)
    if (item.author_name_en && item.author_name_zh === item.author_name_en) {
      const zh = await translate(item.author_name_en);
      if (zh !== item.author_name_en) {
        item.author_name_zh = zh;
      }
    }

    updated++;
    if (updated % 20 === 0) console.log(`  Progress: ${updated}/${items.length}`);

    // Rate limit: 5 requests per second max
    await new Promise(r => setTimeout(r, 250));
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
  console.log(`\nDone! Translated ${updated}, Skipped ${skipped} (already translated)`);
}

main();
