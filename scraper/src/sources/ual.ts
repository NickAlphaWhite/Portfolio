/**
 * UAL Showcase scraper — extracts Next.js embedded JSON for structured data.
 * LCC page → collection links → each collection's __NEXT_DATA__ JSON → projects
 */
import { chromium } from "playwright";
import type { RawScrapedItem, Category } from "../types.js";
import { toPortfolioItem, replaceSourceItems } from "../utils.js";

const BASE = "https://ualshowcase.arts.ac.uk";
const LCC_URL = `${BASE}/c/london-college-of-communication`;

interface UALProject {
  portfolioId: number;
  title: string;
  description: string;
  student: string;
  studentUrl: string;
  source: string;
  assetType: string;
  type: string;
}

async function main(): Promise<void> {
  console.log("=== UAL Showcase — Next.js JSON extraction ===\n");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const allRaw: RawScrapedItem[] = [];

  // Step 1: Get collection slugs from LCC page
  console.log(`Loading: ${LCC_URL}`);
  await page.goto(LCC_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  const collectionSlugs = await page.evaluate(() => {
    const slugs: string[] = [];
    document.querySelectorAll('a[href*="/collection/"]').forEach(el => {
      const href = (el as HTMLAnchorElement).href;
      const match = href.match(/\/collection\/([^/]+)/);
      if (match && !slugs.includes(match[1])) slugs.push(match[1]);
    });
    return slugs;
  });

  console.log(`Found ${collectionSlugs.length} collections: ${collectionSlugs.join(", ")}\n`);

  // Step 2: Extract projects from each collection's Next.js data
  for (const slug of collectionSlugs) {
    const url = `${BASE}/collection/${slug}`;
    console.log(`  ▶ ${slug}`);

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(2000);

      const projects = await page.evaluate(() => {
        const scripts = document.querySelectorAll("script");
        for (const s of scripts) {
          const text = s.textContent || "";
          if (text.includes('"pageProps"')) {
            try {
              const data = JSON.parse(text);
              return (data?.props?.pageProps?.data?.projects || []) as UALProject[];
            } catch { /* continue */ }
          }
        }
        return [];
      });

      console.log(`    → ${projects.length} projects`);

      for (const p of projects) {
        // Strip HTML from description
        const plainDesc = p.description?.replace(/<[^>]+>/g, "").trim() || "";

        allRaw.push({
          source: "ual_lcc",
          source_url: `${BASE}${p.studentUrl}`,
          title: p.title || "Untitled",
          description: plainDesc.slice(0, 1000),
          author_name: p.student || "UAL Student",
          thumbnail_url: p.source || "",
          images: p.source ? [p.source] : [],
          tags: ["ual", "lcc", slug.replace(/-/g, "_")],
          year: 2025,
          institution: "University of the Arts London",
          program: "London College of Communication",
          category: "mixed_media" as Category,
          is_featured: false,
          aspect_ratio: 1.5,
        });
      }
    } catch (err) {
      console.error(`    ✗ Failed:`, err);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  await browser.close();

  if (allRaw.length > 0) {
    replaceSourceItems("ual_lcc", allRaw.map(toPortfolioItem));
    console.log(`\n✅ UAL: ${allRaw.length} projects from ${collectionSlugs.length} collections`);
  } else {
    console.log("\nNo projects found.");
  }
}

main();
