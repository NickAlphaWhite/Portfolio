/**
 * MIT Media Lab — scrape REAL projects (not tag pages).
 * Targets /projects/ page to find individual project overview pages.
 */
import { chromium } from "playwright";
import type { RawScrapedItem, Category } from "../types.js";
import { toPortfolioItem, replaceSourceItems } from "../utils.js";

const PROJECTS_URL = "https://www.media.mit.edu/projects/";

async function main(): Promise<void> {
  console.log("=== MIT Media Lab — Real projects ===\n");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(PROJECTS_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);

  // Find project links — real projects have URLs like /projects/xxx/
  const links = await page.evaluate(() => {
    const result: { name: string; url: string }[] = [];
    const seen = new Set<string>();
    document.querySelectorAll("a[href]").forEach(el => {
      const a = el as HTMLAnchorElement;
      const href = a.href;
      // Only match actual project detail pages
      if (href.includes("/projects/") && !href.includes("filter=") && !href.match(/\/projects\/$/)) {
        const name = a.querySelector("h2, h3, .title")?.textContent?.trim()
          || a.textContent?.trim().slice(0, 80) || "";
        if (name.length > 2 && !seen.has(href)) {
          seen.add(href);
          result.push({ name, url: href });
        }
      }
    });
    return result;
  });

  console.log(`Found ${links.length} real project links\n`);

  const rawItems: RawScrapedItem[] = [];
  const limit = Math.min(links.length, 30);

  for (let i = 0; i < limit; i++) {
    const { name, url } = links[i];
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2000);

      const detail = await page.evaluate(() => {
        const desc = document.querySelector('meta[property="og:description"]')?.getAttribute("content")
          || document.querySelector('meta[name="description"]')?.getAttribute("content")
          || document.querySelector("main p")?.textContent?.trim() || "";
        const img = document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";
        const people: string[] = [];
        document.querySelectorAll(".person, .people, .team-member, .researcher").forEach(el => {
          const n = el.textContent?.trim();
          if (n && n.length < 60) people.push(n);
        });
        return { desc: desc.slice(0, 800), img, people };
      });

      console.log(`  ${i + 1}. ${name.slice(0, 60)} ${detail.img ? '🖼' : ''}`);

      rawItems.push({
        source: "mit_media_lab",
        source_url: url,
        title: name.slice(0, 200),
        description: detail.desc,
        author_name: detail.people[0] || "MIT Media Lab",
        thumbnail_url: detail.img || "",
        images: detail.img ? [detail.img] : [],
        tags: ["mit", "research"],
        year: new Date().getFullYear(),
        institution: "MIT Media Lab",
        program: "Media Arts and Sciences",
        category: "mixed_media" as Category,
        is_featured: false,
        aspect_ratio: 1.6,
      });
    } catch (err) {
      console.log(`  ${i + 1}. ${name.slice(0, 60)} ⚠`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  await browser.close();

  if (rawItems.length > 0) {
    replaceSourceItems("mit_media_lab", rawItems.map(toPortfolioItem));
    console.log(`\n✅ MIT: ${rawItems.length} real projects`);
  }
}

main();
