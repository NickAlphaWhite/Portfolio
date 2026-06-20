import * as fs from "node:fs";
import * as path from "node:path";

const DATA_PATH = path.resolve(import.meta.dirname, "../src/content/items/data.json");
const items = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

let fixed = 0;
for (const item of items) {
  if (item.source !== "core77_awards") continue;

  // Clean title: remove " - by XXX" and " / Core77..." suffixes
  let title = item.title_en;
  const authorMatch = title.match(/\s*[-–—]\s*by\s+(.+)$/i);
  let author = "";

  if (authorMatch) {
    // Extract author and strip from title
    author = authorMatch[1].replace(/\s*\/\s*Core77.*$/i, "").replace(/\s*\/\s*Core 77.*$/i, "").trim();
    title = title.replace(/\s*[-–—]\s*by\s+.+$/i, "").trim();
  }

  // Also strip " / Core77 Design Awards" suffix
  title = title.replace(/\s*\/\s*Core77.*$/i, "").trim();
  title = title.replace(/\s*\/\s*Core 77.*$/i, "").trim();

  if (title !== item.title_en) {
    console.log(`  ${item.title_en.slice(0, 50)} → ${title}`);
    item.title_en = title;
    item.title_zh = title;
    fixed++;
  }

  // Fix author: extract from URL or use cleaned author
  if (author) {
    item.author_name_en = author;
    item.author_name_zh = author;
  } else if (item.author_name_en === "Core77 Winner" || item.author_name_en === "Various") {
    // Try to extract from URL — last segment before the slug
    // Or look for known patterns
    const slug = item.source_url.split("/").pop() || "";
    // The remaining items without authors are probably team/studio projects
    // Keep as is if we can't identify
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
console.log(`\nFixed ${fixed} titles`);
