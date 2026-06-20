/**
 * CMU School of Design scraper.
 * Target: https://www.design.cmu.edu/our-work
 */
import * as cheerio from "cheerio";
import type { RawScrapedItem, Category } from "../types.js";
import { fetchHTML, toPortfolioItem, writeItems } from "../utils.js";

const CMU_URL = "https://www.design.cmu.edu/our-work?field_work_type=498&field_creator_type=All&field_work_year=All&search_api_fulltext=";

function guessCategory(title: string, desc: string): Category {
  const combined = `${title} ${desc}`.toLowerCase();
  if (combined.match(/interface|app|ux|interaction|digital|service|user/)) return "ui_ux";
  if (combined.match(/product|industrial|manufactur|object|furniture/)) return "industrial_design";
  if (combined.match(/graphic|visual|typography|print|poster|brand|communication/)) return "graphic_design";
  if (combined.match(/illustration|draw|sketch/)) return "illustration";
  if (combined.match(/motion|animation|film|video/)) return "motion_graphics";
  if (combined.match(/photo/)) return "photography";
  if (combined.match(/fashion|textile|garment|wearable/)) return "fashion";
  if (combined.match(/architecture|spatial|interior|environment/)) return "architecture";
  if (combined.match(/fine.art|sculpture|paint|gallery/)) return "fine_art";
  return "mixed_media";
}

function parseCMUItems(html: string): RawScrapedItem[] {
  const $ = cheerio.load(html);
  const items: RawScrapedItem[] = [];

  // CMU uses Drupal — look for view rows, article, or project cards
  const selectors = [
    ".views-row", ".node--type-project", ".project-teaser",
    "article", '[class*="project"]', '[class*="work"]',
    ".card", ".grid-item", ".teaser",
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

  if (!$elements || $elements.length === 0) {
    // Fallback: extract any linked images with titles
    $('a[href*="work"], a[href*="project"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";
      const img = $el.find("img").attr("src") || "";
      const title = $el.find("h2, h3, .title").text().trim() || $el.text().trim();
      if (title.length > 3) {
        items.push({
          source: "cmu_design",
          source_url: href.startsWith("http") ? href : `https://www.design.cmu.edu${href}`,
          title: title.slice(0, 200),
          description: "",
          author_name: "CMU Design Student",
          thumbnail_url: img.startsWith("http") ? img : img ? `https://www.design.cmu.edu${img}` : "",
          images: [],
          tags: ["cmu", "student_work"],
          year: new Date().getFullYear(),
          institution: "Carnegie Mellon University",
          program: "School of Design",
          category: "mixed_media",
          is_featured: false,
          aspect_ratio: 1.5,
        });
      }
    });
    return items;
  }

  $elements.each((_, el) => {
    const $el = $(el);
    const title = $el.find("h1, h2, h3, .title, .field-title").first().text().trim();
    const author = $el.find(".author, .student, .designer, .creator, .field-creator").first().text().trim();
    const desc = $el.find("p, .description, .field-body, .excerpt").first().text().trim();
    const program = $el.find(".program, .field-program, .degree").first().text().trim();
    const img = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || "";
    const link = $el.find("a").first().attr("href") || "";

    if (!title || title.length < 3) return;

    const thumbnail = img.startsWith("http") ? img
      : img.startsWith("//") ? `https:${img}`
      : img ? `https://www.design.cmu.edu${img.startsWith("/") ? "" : "/"}${img}` : "";

    items.push({
      source: "cmu_design",
      source_url: link.startsWith("http") ? link : link ? `https://www.design.cmu.edu${link}` : "",
      title: title.slice(0, 200),
      description: desc.slice(0, 500),
      author_name: author || "CMU Design Student",
      thumbnail_url: thumbnail,
      images: [],
      tags: ["cmu", "student_work"],
      year: new Date().getFullYear(),
      institution: "Carnegie Mellon University",
      program: program || "School of Design",
      category: guessCategory(title, desc),
      is_featured: false,
      aspect_ratio: 1.5,
    });
  });

  return items;
}

async function main(): Promise<void> {
  console.log("=== Scraping CMU Design ===\n");
  console.log(`Fetching: ${CMU_URL}`);

  try {
    const html = await fetchHTML(CMU_URL);
    const rawItems = parseCMUItems(html);
    console.log(`  → Found ${rawItems.length} projects`);

    if (rawItems.length === 0) {
      console.log("No items found. CMU site may be JS-rendered.");
      return;
    }

    const items = rawItems.map(toPortfolioItem);
    writeItems(items);
    console.log(`\n✅ CMU complete: ${items.length} items`);
  } catch (err) {
    console.error("Failed to scrape CMU:", err);
  }
}

main();
