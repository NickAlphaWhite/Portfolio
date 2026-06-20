/**
 * Dezeen scraper — DEEP.
 * Homepage → individual article pages → og:image + description
 */
import * as cheerio from "cheerio";
import type { RawScrapedItem, Category } from "../types.js";
import { fetchHTML, toPortfolioItem, replaceSourceItems } from "../utils.js";

const DEZEEN_URL = "https://www.dezeen.com/";

function guessCategory(title: string, desc: string): Category {
  const t = `${title} ${desc}`.toLowerCase();
  if (t.match(/interface|app|ux|interaction|digital|web|tech/)) return "ui_ux";
  if (t.match(/product|industrial|furniture|lighting|chair|object/)) return "industrial_design";
  if (t.match(/graphic|visual|typography|print|poster|brand|logo/)) return "graphic_design";
  if (t.match(/illustration|draw/)) return "illustration";
  if (t.match(/animation|film|video|movie/)) return "motion_graphics";
  if (t.match(/photo/)) return "photography";
  if (t.match(/fashion|textile|garment/)) return "fashion";
  if (t.match(/architecture|interior|building|house|home|office|space/)) return "architecture";
  return "architecture";
}

async function scrapeArticlePage(url: string): Promise<{ desc: string; img: string; author: string } | null> {
  try {
    const html = await fetchHTML(url, 15000);
    const $ = cheerio.load(html);
    let og = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content") || "";
    if (og && (og.includes("logo") || og.includes("Logo") || og.includes("icon"))) og = "";
    // Fallback: find first article image
    if (!og) {
      $("article img, .entry-content img, .post-content img, main img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || "";
        if (src && !og && !src.includes("logo") && !src.includes("Logo") && !src.includes("icon") && !src.includes("pixel")) {
          og = src.startsWith("http") ? src : src.startsWith("//") ? `https:${src}` : "";
        }
      });
    }
    const desc = $('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content")
      || $("main p, article p, .entry-content p").first().text().trim();
    const author = $(".author, .byline, .entry-author").first().text().trim();
    return { desc: desc.slice(0, 1000), img: og || "", author: author || "" };
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  console.log("=== Dezeen — Deep scrape ===\n");
  const html = await fetchHTML(DEZEEN_URL);
  const $ = cheerio.load(html);
  const links: { title: string; url: string }[] = [];

  $("article a[href], .post a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    const title = $(el).find("h2, h3, .title").text().trim() || $(el).text().trim();
    // Skip category/nav pages
    if (href && title.length > 15 && href.startsWith("http") && !title.match(/^(architecture|interiors|design|news|opinion|video|podcast|jobs|events)$/i)) {
      if (!links.find(l => l.url === href)) links.push({ title, url: href });
    }
  });

  console.log(`Found ${links.length} articles. Scraping up to 25...\n`);
  const rawItems: RawScrapedItem[] = [];
  const limit = Math.min(links.length, 25);

  for (let i = 0; i < limit; i++) {
    const { title, url } = links[i];
    const detail = await scrapeArticlePage(url);
    console.log(`  ${i + 1}. ${title.slice(0, 60)} ${detail ? '✅' : '⚠'}`);

    rawItems.push({
      source: "dezeen",
      source_url: url,
      title,
      description: detail?.desc || "",
      author_name: detail?.author || "Dezeen",
      thumbnail_url: detail?.img || "",
      images: detail?.img ? [detail.img] : [],
      tags: ["dezeen", "design", "architecture"],
      year: new Date().getFullYear(),
      institution: "Various",
      program: "Featured Article",
      category: guessCategory(title, detail?.desc || ""),
      is_featured: false,
      aspect_ratio: 1.5,
    });
    await new Promise(r => setTimeout(r, 300));
  }

  if (rawItems.length > 0) {
    replaceSourceItems("dezeen", rawItems.map(toPortfolioItem));
    console.log(`\n✅ Dezeen: ${rawItems.length} items`);
  }
}

main();
