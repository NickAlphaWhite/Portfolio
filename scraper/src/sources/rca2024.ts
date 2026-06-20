/**
 * RCA 2024 — uses Playwright for JS-rendered pages.
 */
import { chromium } from "playwright";
import type { RawScrapedItem, Category } from "../types.js";
import { toPortfolioItem, replaceSourceItems } from "../utils.js";

const PROGRAMMES = [
  "design-mphil-phd", "design-futures-mdes", "design-products-ma",
  "fashion-ma", "global-innovation-design-ma-msc", "healthcare-design-mres",
  "innovation-design-engineering-ma-msc", "service-design-ma", "textiles-ma",
];

function guessCategory(slug: string): Category {
  if (slug.includes("service") || slug.includes("digital")) return "ui_ux";
  if (slug.includes("product") || slug.includes("engineering") || slug.includes("mobility") || slug.includes("healthcare")) return "industrial_design";
  if (slug.includes("fashion") || slug.includes("textile")) return "fashion";
  if (slug.includes("design-futures") || slug.includes("global")) return "mixed_media";
  return "mixed_media";
}

async function main(): Promise<void> {
  console.log("=== RCA 2024 — Playwright browser ===\n");
  const browser = await chromium.launch({ headless: true });
  const allRaw: RawScrapedItem[] = [];

  for (const slug of PROGRAMMES) {
    const url = `https://2024.rca.ac.uk/school/${slug}/`;
    const name = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
      .replace(/\bMa\b/, "MA").replace(/\bMsc\b/i, "MSc").replace(/\bMdes\b/i, "MDes")
      .replace(/\bMres\b/i, "MRes");

    console.log(`\n  ▶ ${name}`);
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

      // Wait for student cards to render
      await page.waitForTimeout(2000);

      // Extract student links
      const students = await page.evaluate(() => {
        const links: { name: string; url: string; img: string }[] = [];
        document.querySelectorAll('a[href*="/students/"]').forEach(el => {
          const a = el as HTMLAnchorElement;
          const name = a.querySelector("h2, h3, .name")?.textContent?.trim() || a.textContent?.trim() || "";
          const img = a.querySelector("img")?.getAttribute("src") || "";
          if (name.length > 2 && a.href) links.push({ name, url: a.href, img });
        });
        return links;
      });

      console.log(`    Found ${students.length} students`);

      // Visit each student page
      for (const s of students.slice(0, 8)) {
        try {
          await page.goto(s.url, { waitUntil: "networkidle", timeout: 20000 });
          await page.waitForTimeout(1000);

          const detail = await page.evaluate(() => {
            const name = document.querySelector("h1")?.textContent?.trim() || "";
            const descEl = document.querySelector("main p, article p, .content p");
            const desc = descEl?.textContent?.trim() || "";
            const imgs: string[] = [];
            document.querySelectorAll("img").forEach(el => {
              const src = el.getAttribute("src") || "";
              if (src && !src.includes("logo") && !src.includes("icon") && !src.includes("emoji")) imgs.push(src);
            });
            return { name, desc: desc.slice(0, 1000), imgs: imgs.slice(0, 10) };
          });

          if (detail.name) {
            allRaw.push({
              source: "rca",
              source_url: s.url,
              title: detail.name,
              description: detail.desc,
              author_name: detail.name,
              thumbnail_url: detail.imgs[0] || s.img || "",
              images: detail.imgs,
              tags: ["rca", "graduate", "class_of_2024", slug],
              year: 2024,
              institution: "Royal College of Art",
              program: name,
              category: guessCategory(slug),
              is_featured: false,
              aspect_ratio: 1.5,
            });
            console.log(`      ✅ ${detail.name}`);
          }
        } catch (err) {
          // skip individual failures
        }
      }
      await page.close();
    } catch (err) {
      console.error(`    ✗ Failed:`, err);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  await browser.close();

  if (allRaw.length > 0) {
    replaceSourceItems("rca", allRaw.map(toPortfolioItem));
    console.log(`\n✅ RCA 2024: ${allRaw.length} items`);
  } else {
    console.log("\nNo items found");
  }
}

main();
