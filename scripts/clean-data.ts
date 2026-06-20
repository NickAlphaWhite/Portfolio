/**
 * Clean data.json — remove items without real descriptions.
 * Keeps only items where description_en has 50+ characters.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const DATA_PATH = path.resolve(
  import.meta.dirname,
  "../src/content/items/data.json"
);

interface PortfolioItem {
  id: string;
  source: string;
  source_url: string;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  author_name_en: string;
  author_name_zh: string;
  year: number;
  institution: string;
  program: string;
  category: string;
  tags: string[];
}

const items: PortfolioItem[] = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

console.log(`Before: ${items.length} items`);

const MIN_DESC_LENGTH = 50;

// Keep items with real descriptions
const clean = items.filter((item) => {
  const desc = (item.description_en || "").trim();
  // Must have a real description (not just navigation text)
  if (desc.length < MIN_DESC_LENGTH) return false;
  // Filter out obvious nav items
  const navWords = ["awards", "jury", "about", "winners", "2024 awards", "2023 awards"];
  const title = item.title_en.toLowerCase().trim();
  if (navWords.includes(title)) return false;
  // Filter out items where title = source name
  if (title === "dezeen" || title === "yanko design" || title === "research" || title === "mit media lab") return false;
  return true;
});

// Sort: featured first, then by year desc
clean.sort((a, b) => {
  if (a.source === "rca" && b.source !== "rca") return -1;
  if (b.source === "rca" && a.source !== "rca") return 1;
  return b.year - a.year || a.title_en.localeCompare(b.title_en);
});

fs.writeFileSync(DATA_PATH, JSON.stringify(clean, null, 2), "utf-8");

const removed = items.length - clean.length;
console.log(`Removed: ${removed} low-quality items`);
console.log(`After: ${clean.length} items with real descriptions`);

// Show source breakdown
const sources: Record<string, number> = {};
clean.forEach((i) => { sources[i.source] = (sources[i.source] || 0) + 1; });
console.log("\nBy source:");
Object.entries(sources)
  .sort((a, b) => b[1] - a[1])
  .forEach(([s, c]) => console.log(`  ${s}: ${c}`));
