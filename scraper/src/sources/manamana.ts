/**
 * Manamana 爬虫
 * Target: https://www.manamana.net/#!zh
 * 中国设计作品集平台，可直接获取中文内容
 */
import * as cheerio from "cheerio";
import type { RawScrapedItem, Category } from "../types.js";
import { fetchHTML, toPortfolioItem, writeItems } from "../utils.js";

const MANAMANA_URL = "https://www.manamana.net/";

function guessCategory(title: string, desc: string, tags: string[]): Category {
  const combined = `${title} ${desc} ${tags.join(" ")}`.toLowerCase();
  if (combined.match(/界面|交互|体验|ui|ux|app|网页|数字/)) return "ui_ux";
  if (combined.match(/产品|工业|家具|灯具|器物/)) return "industrial_design";
  if (combined.match(/平面|视觉|字体|品牌|海报|书籍|包装/)) return "graphic_design";
  if (combined.match(/插画|绘画|手绘/)) return "illustration";
  if (combined.match(/动画|动态|视频|影像|短片/)) return "motion_graphics";
  if (combined.match(/摄影|照片/)) return "photography";
  if (combined.match(/服装|时尚|纺织|首饰/)) return "fashion";
  if (combined.match(/建筑|空间|室内|景观|环境/)) return "architecture";
  if (combined.match(/艺术|雕塑|装置|画廊/)) return "fine_art";
  return "mixed_media";
}

function parseManamanaItems(html: string): RawScrapedItem[] {
  const $ = cheerio.load(html);
  const items: RawScrapedItem[] = [];

  // Manamana is a SPA — cheerio may not capture JavaScript-rendered content
  // Try to extract from any embedded data or pre-rendered elements
  const selectors = [
    ".project-card", ".work-item", '[class*="project"]',
    '[class*="work"]', '[class*="card"]', "article",
    ".grid-item", ".list-item",
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
    // Try to find project links
    $('a[href*="project"], a[href*="work"], a[href*="detail"], a[href*="shot"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";
      const title = $el.find(".title, h3, h4").text().trim() || $el.text().trim();
      const img = $el.find("img").attr("src") || $el.find("img").attr("data-src") || "";
      if (title.length > 2 && href) {
        items.push({
          source: "manamana",
          source_url: href.startsWith("http") ? href : `https://www.manamana.net${href}`,
          title: title.slice(0, 200),
          description: "",
          author_name: "Manamana Designer",
          thumbnail_url: img.startsWith("http") ? img : img ? `https://www.manamana.net${img}` : "",
          images: [],
          tags: ["manamana", "chinese_design"],
          year: new Date().getFullYear(),
          institution: "Various Institutions",
          program: "Portfolio",
          category: "mixed_media",
          is_featured: false,
          aspect_ratio: 1.5,
        });
      }
    });

    // If still nothing found, try extracting from __NEXT_DATA__ or similar
    if (items.length === 0) {
      const scripts = $("script").map((_, s) => $(s).html() || "").get();
      for (const script of scripts) {
        // Try to find JSON data embedded in script tags
        try {
          if (script.includes('"project"') || script.includes('"work"') || script.includes('"shot"')) {
            console.log("  Found potential embedded data in script tag");
            // Extract JSON-like structures with project data
            const jsonMatches = script.match(/\{[^}]*"title"[^}]*\}/g) || [];
            for (const match of jsonMatches.slice(0, 10)) {
              try {
                const data = JSON.parse(match);
                if (data.title) {
                  items.push({
                    source: "manamana",
                    source_url: "",
                    title: data.title.slice(0, 200),
                    description: data.description || data.desc || "",
                    author_name: data.author || data.designer || data.creator || "Manamana Designer",
                    thumbnail_url: data.image || data.thumbnail || data.img || "",
                    images: [],
                    tags: ["manamana", "chinese_design"],
                    year: new Date().getFullYear(),
                    institution: data.school || data.institution || "Various Institutions",
                    program: data.program || data.major || "Portfolio",
                    category: "mixed_media",
                    is_featured: false,
                    aspect_ratio: 1.5,
                  });
                }
              } catch { /* not valid JSON */ }
            }
          }
        } catch { /* skip malformed scripts */ }
      }
    }

    return items;
  }

  $elements.each((_, el) => {
    const $el = $(el);
    const title = $el.find(".title, h3, h4, .project-title").first().text().trim();
    const author = $el.find(".author, .designer, .creator, .user-name").first().text().trim();
    const desc = $el.find(".description, .desc, p").first().text().trim();
    const img = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || "";
    const link = $el.find("a").first().attr("href") || "";
    const tags: string[] = ["manamana", "chinese_design"];

    if (!title || title.length < 2) return;

    items.push({
      source: "manamana",
      source_url: link.startsWith("http") ? link : link ? `https://www.manamana.net${link}` : "",
      title: title.slice(0, 200),
      description: desc.slice(0, 500),
      author_name: author || "Manamana Designer",
      thumbnail_url: img.startsWith("http") ? img : img ? `https://www.manamana.net${img}` : "",
      images: [],
      tags,
      year: new Date().getFullYear(),
      institution: "Various Institutions",
      program: "Portfolio",
      category: guessCategory(title, desc, tags),
      is_featured: false,
      aspect_ratio: 1.5,
    });
  });

  return items;
}

async function main(): Promise<void> {
  console.log("=== Scraping Manamana ===\n");
  console.log("Note: Manamana is a SPA (Single Page App).");
  console.log("HTML scraping may not capture all content.\n");
  console.log(`Fetching: ${MANAMANA_URL}`);

  try {
    const html = await fetchHTML(MANAMANA_URL);
    const rawItems = parseManamanaItems(html);
    console.log(`  → Found ${rawItems.length} projects`);

    if (rawItems.length === 0) {
      console.log("\n⚠ Manamana appears to be fully client-rendered.");
      console.log("Consider using Playwright/Puppeteer for this source.");
      console.log("Or check if they have an API: https://www.manamana.net/api/...");
      return;
    }

    const items = rawItems.map(toPortfolioItem);
    writeItems(items);
    console.log(`\n✅ Manamana complete: ${items.length} items`);
  } catch (err) {
    console.error("Failed to scrape Manamana:", err);
  }
}

main();
