import * as fs from "node:fs";
import * as path from "node:path";
import type { PortfolioItem, RawScrapedItem } from "./types.js";

const DATA_PATH = path.resolve(
  import.meta.dirname,
  "../../src/content/items/data.json"
);

/**
 * Read existing items from data.json to avoid duplicates.
 */
export function readExisting(): PortfolioItem[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) as PortfolioItem[];
  } catch {
    return [];
  }
}

/**
 * Write items to data.json, merging with existing.
 */
export function writeItems(items: PortfolioItem[]): void {
  const existing = readExisting();
  const existingIds = new Set(existing.map((i) => i.id));

  // Only add new items
  let added = 0;
  for (const item of items) {
    if (!existingIds.has(item.id)) {
      existing.push(item);
      existingIds.add(item.id);
      added++;
    }
  }

  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(existing, null, 2), "utf-8");
  console.log(`Saved ${added} new items (total: ${existing.length})`);
}

/**
 * Replace all items from a given source with new items.
 * Useful when re-scraping with deeper detail.
 */
export function replaceSourceItems(source: string, items: PortfolioItem[]): void {
  const existing = readExisting();
  // Remove old items from this source
  const filtered = existing.filter((i) => i.source !== source);
  // Add new items
  filtered.push(...items);
  // Sort by year desc, then title
  filtered.sort((a, b) => b.year - a.year || a.title_en.localeCompare(b.title_en));

  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(filtered, null, 2), "utf-8");
  console.log(`Replaced ${source}: ${items.length} items (total now: ${filtered.length})`);
}

/**
 * Slugify a string for use as an ID.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}

/**
 * Helper to create a unique item ID.
 */
export function makeId(source: string, author: string, title: string, year: number): string {
  const authorSlug = slugify(author).slice(0, 20);
  const titleSlug = slugify(title).slice(0, 40);
  return `${source}_${authorSlug}_${titleSlug}_${year}`;
}

/**
 * Convert a raw scraped item to a full PortfolioItem.
 * Chinese translations are placeholder — replace with real translation API later.
 */
export function toPortfolioItem(raw: RawScrapedItem): PortfolioItem {
  const id = makeId(raw.source, raw.author_name, raw.title, raw.year);
  const imgDir = "/portfolio-inspiration/images/items";

  // Preserve real image URLs from scraping. If the image is not an HTTP URL,
  // use the local placeholder path.
  const toLocalOrKeep = (url: string, suffix: string): string => {
    if (url && url.startsWith("http")) return url; // keep real URL
    return `${imgDir}/${id}${suffix}`; // local fallback
  };

  return {
    id,
    source: raw.source,
    source_url: raw.source_url,
    scraped_at: new Date().toISOString(),
    title_en: raw.title,
    title_zh: raw.title, // TODO: real translation via translation API
    description_en: raw.description,
    description_zh: raw.description, // TODO: real translation via translation API
    author_name_en: raw.author_name,
    author_name_zh: raw.author_name, // TODO: real translation via translation API
    thumbnail: toLocalOrKeep(raw.thumbnail_url, ".svg"),
    images: raw.images.map((url, i) => toLocalOrKeep(url, `_${i + 1}.svg`)),
    category: raw.category,
    tags: raw.tags,
    year: raw.year,
    institution: raw.institution,
    program: raw.program,
    is_featured: raw.is_featured,
    aspect_ratio: raw.aspect_ratio,
  };
}

/**
 * Simple fetch wrapper with timeout.
 */
export async function fetchHTML(
  url: string,
  timeoutMs = 15000
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PortfolioInspoBot/1.0; +https://github.com/nickalphawhite/portfolio-inspiration)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}
