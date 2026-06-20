/**
 * Fast batch translation — titles only, 5 concurrent requests.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const DATA_PATH = path.resolve(import.meta.dirname, "../../src/content/items/data.json");

async function translate(text: string): Promise<string> {
  // Try MyMemory first (no API key needed)
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json() as any;
    if (data?.responseData?.translatedText) {
      const t = data.responseData.translatedText;
      if (t !== text && t.length > 0) return t;
    }
  } catch {}

  // Fallback: try Google via different endpoint
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json() as any;
    const t = data?.[0]?.map((s: any[]) => s[0]).join("");
    if (t && t !== text) return t;
  } catch {}

  return text;
}

async function main(): Promise<void> {
  const items = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  const toTranslate: number[] = [];

  for (let i = 0; i < items.length; i++) {
    if (!items[i].title_zh || items[i].title_zh === items[i].title_en) {
      toTranslate.push(i);
    }
  }

  console.log(`Need to translate: ${toTranslate.length}/${items.length}`);

  // Process 5 at a time
  const batchSize = 5;
  for (let b = 0; b < toTranslate.length; b += batchSize) {
    const batch = toTranslate.slice(b, b + batchSize);
    const results = await Promise.all(
      batch.map(async (idx) => {
        const zh = await translate(items[idx].title_en);
        return { idx, zh };
      })
    );

    for (const { idx, zh } of results) {
      if (zh !== items[idx].title_en) {
        items[idx].title_zh = zh;
      }
    }

    const done = Math.min(b + batchSize, toTranslate.length);
    console.log(`  ${done}/${toTranslate.length}`);
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
  console.log(`\nDone! ${toTranslate.length} titles translated`);
}

main();
