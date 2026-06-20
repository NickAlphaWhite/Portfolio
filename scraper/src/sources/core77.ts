/**
 * Core77 Design Awards scraper — DEEP.
 * Award list → individual entry pages → full details + images
 */
import * as cheerio from "cheerio";
import type { RawScrapedItem, Category } from "../types.js";
import { fetchHTML, toPortfolioItem, replaceSourceItems } from "../utils.js";

const URLS = [
  { url: "https://designawards.core77.com/2021/speculative-design", year: 2021 },
  { url: "https://designawards.core77.com/2022/speculative-design", year: 2022 },
];

function guessCategory(title: string, desc: string): Category {
  const t = `${title} ${desc}`.toLowerCase();
  if (t.match(/interface|app|ux|interaction|digital|web/)) return "ui_ux";
  if (t.match(/product|furniture|lighting|object|hardware/)) return "industrial_design";
  if (t.match(/graphic|visual|typography|print|poster|brand/)) return "graphic_design";
  if (t.match(/illustration|draw/)) return "illustration";
  if (t.match(/animation|film|video/)) return "motion_graphics";
  if (t.match(/photo/)) return "photography";
  if (t.match(/fashion|textile|garment/)) return "fashion";
  if (t.match(/architecture|space|interior/)) return "architecture";
  return "mixed_media";
}

async function scrapeEntryPage(url: string): Promise<{ desc: string; img: string; author: string; institution: string } | null> {
  try {
    const html = await fetchHTML(url, 15000);
    const $ = cheerio.load(html);
    const og = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content") || "";
    const desc = $('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content")
      || $("main p, .entry-content p, article p").first().text().trim();
    const author = $(".designer, .student, .creator, .author").first().text().trim();
    const inst = $(".school, .university, .institution").first().text().trim();
    return { desc: desc.slice(0, 1000), img: og || "", author: author || "", institution: inst || "" };
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  console.log("=== Core77 — Deep scrape ===\n");
  const allRaw: RawScrapedItem[] = [];

  for (const { url, year } of URLS) {
    console.log(`Fetching ${year}: ${url}`);
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);
    const links: { title: string; url: string }[] = [];

    $('a[href*="entry"], a[href*="project"], a[href*="award"]').each((_, el) => {
      const href = ($(el).attr("href") || "").trim();
      const title = $(el).find("h2, h3, .title").text().trim() || $(el).text().trim();
      if (href && title.length > 5 && !/^(winners|jury|about|\d{4} awards)$/i.test(title)) {
        const full = href.startsWith("http") ? href : `https://designawards.core77.com${href}`;
        if (!links.find(l => l.url === full)) links.push({ title, url: full });
      }
    });

    console.log(`  Found ${links.length} entries. Scraping up to 20...`);
    const limit = Math.min(links.length, 20);

    for (let i = 0; i < limit; i++) {
      const { title, url: entryUrl } = links[i];
      const detail = await scrapeEntryPage(entryUrl);
      console.log(`  ${i + 1}. ${title.slice(0, 60)} ${detail ? '✅' : '⚠'}`);

      allRaw.push({
        source: "core77_awards",
        source_url: entryUrl,
        title,
        description: detail?.desc || "",
        author_name: detail?.author || "Core77 Winner",
        thumbnail_url: detail?.img || "",
        images: detail?.img ? [detail.img] : [],
        tags: ["core77", "award", "speculative_design", String(year)],
        year,
        institution: detail?.institution || "Various",
        program: `Core77 Design Awards — Speculative Design ${year}`,
        category: guessCategory(title, detail?.desc || ""),
        is_featured: true,
        aspect_ratio: 1.5,
      });
      await new Promise(r => setTimeout(r, 300));
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  if (allRaw.length > 0) {
    replaceSourceItems("core77_awards", allRaw.map(toPortfolioItem));
    console.log(`\n✅ Core77: ${allRaw.length} items`);
  }
}

main();
