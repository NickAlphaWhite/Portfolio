/**
 * Link-only scraper — for JS sites where we just need clickable cards.
 * Uses Playwright to load the page, extracts all project/student links,
 * creates minimal items that link directly to the source.
 */
import { chromium } from "playwright";
import type { RawScrapedItem, Category } from "../types.js";
import { toPortfolioItem, writeItems, slugify } from "../utils.js";

interface SiteConfig {
  name: string;
  url: string;
  institution: string;
  program: string;
  source: string;
  category: Category;
  year: number;
  linkSelector: string; // CSS selector for links to extract
  titleSelector?: string; // optional: where to get the title text
}

const SITES: SiteConfig[] = [
  {
    name: "UAL — London College of Communication",
    url: "https://graduateshowcase.arts.ac.uk/c/london-college-of-communication",
    institution: "University of the Arts London",
    program: "London College of Communication",
    source: "ual_lcc",
    category: "mixed_media",
    year: 2025,
    linkSelector: 'a[href*="/c/"], a[href*="/student/"], a[href*="/project/"], a[href*="/profile/"]',
  },
  {
    name: "NYU ITP Thesis 2022",
    url: "https://itp.nyu.edu/thesis2022/",
    institution: "New York University",
    program: "Interactive Telecommunications Program",
    source: "nyu_itp",
    category: "mixed_media",
    year: 2022,
    linkSelector: 'a[href*="thesis"], a[href*="student"], a[href*="project"], a[href*="people"]',
  },
  {
    name: "MIT Media Lab",
    url: "https://www.media.mit.edu/projects/",
    institution: "MIT Media Lab",
    program: "Media Arts and Sciences",
    source: "mit_media_lab",
    category: "mixed_media" as Category,
    year: 2025,
    linkSelector: 'a[href*="/groups/"], a[href*="/projects/"], a[href*="/research/"]',
  },
];

async function scrapeLinks(site: SiteConfig): Promise<RawScrapedItem[]> {
  console.log(`\n=== ${site.name} ===`);
  console.log(`URL: ${site.url}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(site.url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    const links = await page.evaluate((selector: string) => {
      const result: { title: string; url: string }[] = [];
      const seen = new Set<string>();

      document.querySelectorAll(selector).forEach(el => {
        const a = el.closest("a") || el;
        const href = (a as HTMLAnchorElement).href;
        const title = a.querySelector("h1, h2, h3, .title, .name")?.textContent?.trim()
          || a.textContent?.trim().slice(0, 80)
          || "";
        if (href && title.length > 2 && !seen.has(href) && !href.includes("mailto:")) {
          seen.add(href);
          result.push({ title, url: href });
        }
      });
      return result;
    }, site.linkSelector);

    console.log(`  Found ${links.length} links`);

    // Fallback: if no specific links, try all links
    if (links.length === 0) {
      const allLinks = await page.evaluate(() => {
        const result: { title: string; url: string }[] = [];
        const seen = new Set<string>();
        document.querySelectorAll("a[href]").forEach(el => {
          const a = el as HTMLAnchorElement;
          const href = a.href;
          const title = a.textContent?.trim().slice(0, 80) || "";
          if (href && title.length > 3 && !seen.has(href) && !href.includes("mailto:") && !href.includes("#") && href.startsWith("http")) {
            seen.add(href);
            result.push({ title, url: href });
          }
        });
        return result;
      });
      // Filter to likely student/project URLs
      const relevant = allLinks.filter(l =>
        l.url.includes("student") || l.url.includes("project") ||
        l.url.includes("thesis") || l.url.includes("work") ||
        l.url.includes("profile") || l.url.includes("portfolio")
      );
      console.log(`  Fallback: ${relevant.length} relevant links from ${allLinks.length} total`);
      links.push(...relevant.slice(0, 30));
    }

    const items: RawScrapedItem[] = links.slice(0, 30).map(l => ({
      source: site.source,
      source_url: l.url,
      title: l.title.slice(0, 200),
      description: "",
      author_name: l.title.slice(0, 80),
      thumbnail_url: "",
      images: [],
      tags: [site.source, String(site.year)],
      year: site.year,
      institution: site.institution,
      program: site.program,
      category: site.category,
      is_featured: false,
      aspect_ratio: 1.5,
    }));

    return items;
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  console.log("=== Link-only scraper for JS-rendered sites ===\n");

  for (const site of SITES) {
    try {
      const items = await scrapeLinks(site);
      if (items.length > 0) {
        writeItems(items.map(toPortfolioItem));
      }
    } catch (err) {
      console.error(`  Failed:`, err);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("\n✅ Done!");
}

main();
