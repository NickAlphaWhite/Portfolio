import * as fs from "node:fs";
import * as path from "node:path";

const DATA_PATH = path.resolve(import.meta.dirname, "../src/content/items/data.json");
const items = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

// Also try to fetch page title for better results
async function fetchTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const html = await res.text();
    const og = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
    if (og) return og[1];
    const tw = html.match(/<meta[^>]+name="twitter:title"[^>]+content="([^"]+)"/i);
    if (tw) return tw[1];
    const title = html.match(/<title>([^<]+)<\/title>/i);
    if (title) return title[1].replace(/\s*\|\s*.+$/, "").trim();
    return null;
  } catch {
    return null;
  }
}

let fixed = 0;

for (const item of items) {
  if (item.source !== "core77_awards" || !item.title_en.startsWith("By ")) continue;

  // Try to get URL slug as project name
  const url = item.source_url;
  const slug = url.split("/").pop() || "";
  const fromSlug = slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

  if (fromSlug.length > 2 && !fromSlug.match(/^\d+$/)) {
    // Try fetching real title from page
    console.log(`  ${item.title_en.slice(0, 40)} → URL slug: ${fromSlug}`);
    const realTitle = await fetchTitle(url);

    if (realTitle && realTitle.length > 3 && !realTitle.startsWith("By ")) {
      item.title_en = realTitle;
      item.title_zh = realTitle; // will be re-translated later
      console.log(`    ✅ page title: ${realTitle}`);
    } else {
      item.title_en = fromSlug;
      item.title_zh = fromSlug;
      console.log(`    ⚠ using slug: ${fromSlug}`);
    }
    fixed++;
  }
  if (fixed % 5 === 0) await new Promise(r => setTimeout(r, 500));
}

fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
console.log(`\nFixed ${fixed} titles`);
