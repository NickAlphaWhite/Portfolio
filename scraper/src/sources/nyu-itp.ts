/**
 * NYU ITP Thesis scraper.
 * URL pattern: https://itp.nyu.edu/thesis/2022/?student-name
 */
import { chromium } from "playwright";
import type { RawScrapedItem, Category } from "../types.js";
import { toPortfolioItem, replaceSourceItems } from "../utils.js";

const THESIS_URL = "https://itp.nyu.edu/thesis/2022/";

async function main(): Promise<void> {
  console.log("=== NYU ITP Thesis 2022 ===\n");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log(`Loading: ${THESIS_URL}`);
  try {
    await page.goto(THESIS_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);

    const title = await page.title();
    console.log(`Title: "${title}"`);

    // Try to find student links — pattern: ?student-name
    const links = await page.evaluate(() => {
      const result: { name: string; url: string }[] = [];
      const seen = new Set<string>();

      // Check for query parameter links
      document.querySelectorAll("a[href]").forEach(el => {
        const a = el as HTMLAnchorElement;
        const href = a.href;
        const text = a.textContent?.trim().slice(0, 80) || "";
        if (href && text.length > 2 && !seen.has(href) && href !== window.location.href) {
          seen.add(href);
          result.push({ name: text, url: href });
        }
      });
      return result;
    });

    console.log(`Found ${links.length} links`);

    // Filter to likely student links
    const studentLinks = links.filter(l =>
      l.url.includes("?") || l.url.includes("student") || l.url.includes("thesis/20")
    );
    console.log(`Student links: ${studentLinks.length}`);

    // Show first few
    studentLinks.slice(0, 15).forEach(l =>
      console.log(`  ${l.url.slice(0, 80)} | ${l.name}`)
    );

    const rawItems: RawScrapedItem[] = studentLinks.slice(0, 30).map(l => ({
      source: "nyu_itp",
      source_url: l.url,
      title: l.name.slice(0, 200),
      description: "",
      author_name: l.name.slice(0, 80),
      thumbnail_url: "",
      images: [],
      tags: ["nyu", "itp", "thesis", "2022"],
      year: 2022,
      institution: "New York University",
      program: "Interactive Telecommunications Program (ITP)",
      category: "mixed_media" as Category,
      is_featured: false,
      aspect_ratio: 1.5,
    }));

    if (rawItems.length > 0) {
      replaceSourceItems("nyu_itp", rawItems.map(toPortfolioItem));
      console.log(`\n✅ NYU ITP: ${rawItems.length} items`);
    } else {
      console.log("\nNo student links found.");
    }
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await browser.close();
  }
}

main();
