/**
 * RISD (Rhode Island School of Design) scraper.
 *
 * Targets student work galleries and graduate showcases.
 * Primary source: https://www.risd.edu/
 * Also tries: https://portfolio.risd.edu/
 */
import * as cheerio from "cheerio";
import type { RawScrapedItem, Category } from "../types.js";
import { fetchHTML, toPortfolioItem, writeItems } from "../utils.js";

const RISD_URLS = [
  "https://www.risd.edu/",
  "https://www.risd.edu/student-work",
  "https://www.risd.edu/academics",
];

// Common RISD departments and their categories
const DEPARTMENT_CATEGORIES: Record<string, Category> = {
  "graphic design": "graphic_design",
  "illustration": "illustration",
  "industrial design": "industrial_design",
  "furniture design": "industrial_design",
  "ceramics": "fine_art",
  "glass": "fine_art",
  "jewelry": "fashion",
  "painting": "fine_art",
  "sculpture": "fine_art",
  "printmaking": "fine_art",
  "photography": "photography",
  "film": "motion_graphics",
  "textiles": "fashion",
  "apparel design": "fashion",
  "architecture": "architecture",
  "interior architecture": "architecture",
  "landscape architecture": "architecture",
  "digital media": "ui_ux",
};

function guessCategory(title: string, desc: string, dept: string): Category {
  const combined = `${title} ${desc} ${dept}`.toLowerCase();

  for (const [key, cat] of Object.entries(DEPARTMENT_CATEGORIES)) {
    if (combined.includes(key)) return cat;
  }

  if (combined.match(/interface|app|ux|interaction|digital|web/)) return "ui_ux";
  if (combined.match(/product|furniture|lighting|object/)) return "industrial_design";
  if (combined.match(/graphic|visual|typography|print|poster|brand/)) return "graphic_design";
  if (combined.match(/illustration|draw|sketch/)) return "illustration";
  if (combined.match(/motion|animation|film|video/)) return "motion_graphics";
  if (combined.match(/photo|lens|camera/)) return "photography";
  if (combined.match(/fashion|textile|garment|wearable|jewelry/)) return "fashion";
  if (combined.match(/architecture|interior|space|landscape/)) return "architecture";
  if (combined.match(/fine.art|sculpture|paint|ceramic|glass/)) return "fine_art";
  return "mixed_media";
}

function parseRISDContent(html: string, baseUrl: string): RawScrapedItem[] {
  const $ = cheerio.load(html);
  const items: RawScrapedItem[] = [];

  // Find student projects / portfolio items
  const selectors = [
    ".student-work", ".project", '[class*="project"]',
    '[class*="work"]', '[class*="portfolio"]', "article",
    ".card", ".tile", ".grid-item", ".listing-item",
  ];

  let $elements: cheerio.Cheerio<any> | null = null;
  for (const sel of selectors) {
    const els = $(sel);
    if (els.length >= 3) {
      $elements = els;
      console.log(`  Using selector "${sel}" → ${els.length} elements`);
      break;
    }
  }

  if ($elements && $elements.length > 0) {
    $elements.each((_, el) => {
      const $el = $(el);
      const title = $el.find("h1, h2, h3, .title, .name, .project-title").first().text().trim();
      const author = $el.find(".author, .student, .designer, .creator").first().text().trim();
      const desc = $el.find("p, .description, .summary, .excerpt").first().text().trim();
      const img = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || "";
      const link = $el.find("a").first().attr("href") || "";
      const dept = $el.find(".department, .major, .program").first().text().trim();

      if (!title || title.length < 3) return;

      const thumbnail = img.startsWith("http") ? img
        : img.startsWith("//") ? `https:${img}`
        : img ? `https://www.risd.edu${img.startsWith("/") ? "" : "/"}${img}` : "";

      items.push({
        source: "risd",
        source_url: link.startsWith("http") ? link : link ? `https://www.risd.edu${link}` : "",
        title: title.slice(0, 200),
        description: desc.slice(0, 500),
        author_name: author || "RISD Student",
        thumbnail_url: thumbnail,
        images: [],
        tags: ["risd", "student_work", dept.toLowerCase().replace(/\s+/g, "_")],
        year: new Date().getFullYear(),
        institution: "Rhode Island School of Design",
        program: dept || "RISD",
        category: guessCategory(title, desc, dept),
        is_featured: false,
        aspect_ratio: 1.5,
      });
    });
  }

  // Fallback: collect all linked images with descriptions
  if (items.length === 0) {
    console.log("  No structured elements found, trying link extraction...");

    // Look for department/section links
    $('a[href*="student"], a[href*="work"], a[href*="project"], a[href*="portfolio"], a[href*="gallery"], a[href*="show"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";
      const title = $el.find("h2, h3, .title").text().trim() || $el.text().trim();
      const img = $el.find("img").attr("src") || $el.find("img").attr("data-src") || "";
      if (title.length > 3 && href && !href.includes("mailto:")) {
        items.push({
          source: "risd",
          source_url: href.startsWith("http") ? href : `https://www.risd.edu${href}`,
          title: title.slice(0, 200),
          description: "",
          author_name: "RISD Student",
          thumbnail_url: img.startsWith("http") ? img : img ? `https://www.risd.edu${img}` : "",
          images: [],
          tags: ["risd", "student_work"],
          year: new Date().getFullYear(),
          institution: "Rhode Island School of Design",
          program: "RISD",
          category: "mixed_media",
          is_featured: false,
          aspect_ratio: 1.5,
        });
      }
    });
  }

  return items;
}

async function main(): Promise<void> {
  console.log("=== Scraping RISD ===\n");

  const allRaw: RawScrapedItem[] = [];

  for (const url of RISD_URLS) {
    console.log(`Fetching: ${url}`);
    try {
      const html = await fetchHTML(url);
      const items = parseRISDContent(html, url);
      console.log(`  → Found ${items.length} items`);
      allRaw.push(...items);
    } catch (err) {
      console.error(`  ✗ Failed:`, err);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  if (allRaw.length === 0) {
    console.log("\nNo items found. RISD site may use JS rendering or have changed structure.");
    console.log("Try manually visiting https://www.risd.edu/student-work for the correct URL.");
    return;
  }

  const items = allRaw.map(toPortfolioItem);
  writeItems(items);
  console.log(`\n✅ RISD complete: ${items.length} items`);
}

main();
