/**
 * Yanko Design scraper.
 * Target: https://www.yankodesign.com/
 * One of the largest modern design blogs.
 */
import * as cheerio from "cheerio";
import type { RawScrapedItem, Category } from "../types.js";
import { fetchHTML, toPortfolioItem, writeItems } from "../utils.js";

const YANKO_URL = "https://www.yankodesign.com/";

function guessCategory(title: string, desc: string, tags: string[]): Category {
  const combined = `${title} ${desc} ${tags.join(" ")}`.toLowerCase();
  if (combined.match(/interface|app|ux|interaction|digital|web|ui/)) return "ui_ux";
  if (combined.match(/product|industrial|object|furniture|lighting|kitchen/)) return "industrial_design";
  if (combined.match(/graphic|visual|typography|print|poster|brand/)) return "graphic_design";
  if (combined.match(/illustration|draw|sketch|art/)) return "illustration";
  if (combined.match(/motion|animation|film|video/)) return "motion_graphics";
  if (combined.match(/photo|camera/)) return "photography";
  if (combined.match(/fashion|textile|garment|wearable|shoe/)) return "fashion";
  if (combined.match(/architecture|interior|building|space|home/)) return "architecture";
  return "industrial_design"; // Yanko is heavily industrial design
}

function parseYankoPosts(html: string): RawScrapedItem[] {
  const $ = cheerio.load(html);
  const items: RawScrapedItem[] = [];

  // Try common WordPress / modern blog selectors
  const selectors = [
    "article.post", "article", ".post-item", ".post",
    '[class*="post"]', '[class*="article"]',
    ".listing-item", ".card",
  ];

  let $elements: cheerio.Cheerio<any> | null = null;
  for (const sel of selectors) {
    const els = $(sel);
    if (els.length >= 5) {
      $elements = els;
      console.log(`  Using selector "${sel}" → ${els.length} elements`);
      break;
    }
  }

  if (!$elements || $elements.length === 0) {
    $("article, .post, [class*='post']").each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find("a").first();
      const href = linkEl.attr("href") || "";
      const title = $el.find("h2, h3, .title, .entry-title").text().trim();
      const img = $el.find("img").attr("src") || $el.find("img").attr("data-src") || $el.find("img").attr("data-lazy-src") || "";
      if (title.length > 3 && href) {
        items.push({
          source: "yankodesign",
          source_url: href.startsWith("http") ? href : `https://www.yankodesign.com${href}`,
          title: title.slice(0, 200),
          description: "",
          author_name: "Yanko Design",
          thumbnail_url: img.startsWith("http") ? img : img.startsWith("//") ? `https:${img}` : "",
          images: [],
          tags: ["yankodesign", "design_blog"],
          year: new Date().getFullYear(),
          institution: "Various",
          program: "Featured Design",
          category: "industrial_design",
          is_featured: false,
          aspect_ratio: 1.5,
        });
      }
    });
    return items;
  }

  $elements.each((_, el) => {
    const $el = $(el);
    const linkEl = $el.find("a").first();
    const titleEl = $el.find("h2, h3, .title, .entry-title, .post-title");
    const title = titleEl.text().trim();
    const desc = $el.find(".excerpt, .entry-summary, .description, p").first().text().trim();
    const img = $el.find("img").first().attr("src")
      || $el.find("img").first().attr("data-src")
      || $el.find("img").first().attr("data-lazy-src")
      || "";
    const href = linkEl.attr("href") || "";
    const author = $el.find(".author, .byline, .entry-author").first().text().trim();
    const tags: string[] = ["yankodesign", "design_blog"];

    $el.find(".category, .tag, .cat-links a").each((_, t) => {
      const tag = $(t).text().trim();
      if (tag && tag.length < 50) tags.push(tag.toLowerCase().replace(/\s+/g, "_"));
    });

    if (!title || title.length < 3) return;

    items.push({
      source: "yankodesign",
      source_url: href.startsWith("http") ? href : href ? `https://www.yankodesign.com${href}` : "",
      title: title.slice(0, 200),
      description: desc.slice(0, 500),
      author_name: author || "Yanko Design",
      thumbnail_url: img.startsWith("http") ? img : img.startsWith("//") ? `https:${img}` : "",
      images: [],
      tags,
      year: new Date().getFullYear(),
      institution: "Various",
      program: "Featured Design",
      category: guessCategory(title, desc, tags),
      is_featured: false,
      aspect_ratio: 1.5,
    });
  });

  return items;
}

async function main(): Promise<void> {
  console.log("=== Scraping Yanko Design ===\n");
  console.log(`Fetching: ${YANKO_URL}`);

  try {
    const html = await fetchHTML(YANKO_URL);
    const rawItems = parseYankoPosts(html);
    console.log(`  → Found ${rawItems.length} posts`);

    if (rawItems.length === 0) {
      console.log("No items found. Yanko Design site may have changed structure.");
      return;
    }

    const items = rawItems.map(toPortfolioItem);
    writeItems(items);
    console.log(`\n✅ Yanko Design complete: ${items.length} items`);
  } catch (err) {
    console.error("Failed to scrape Yanko Design:", err);
  }
}

main();
