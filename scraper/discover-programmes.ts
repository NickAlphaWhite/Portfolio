/**
 * Auto-discover REAL programme URLs from RCA websites.
 * Fetches the programmes listing page and extracts all MA programme links.
 */
import { fetchHTML } from "./src/utils.js";
import * as cheerio from "cheerio";

async function discover(base: string, label: string): Promise<string[]> {
  console.log(`\n=== ${label}: ${base} ===`);
  const urls = [
    `${base}/programmes/`,
    `${base}/schools/school-of-design/`,
    `${base}/school/school-of-design/`,
    base,
  ];

  const allLinks = new Set<string>();

  for (const url of urls) {
    try {
      console.log(`Trying: ${url}`);
      const html = await fetchHTML(url);
      const $ = cheerio.load(html);

      // Find all programme links
      $('a[href*="/programmes/"]').each((_, el) => {
        const href = ($(el).attr("href") || "").trim();
        if (href.includes("/programmes/") && href.endsWith("-ma/")) {
          const full = href.startsWith("http") ? href : `${base}${href.startsWith("/") ? "" : "/"}${href}`;
          allLinks.add(full);
        }
      });

      if (allLinks.size > 0) {
        console.log(`  Found ${allLinks.size} programmes at ${url}`);
        break;
      }
    } catch (err) {
      console.log(`  Failed: ${err}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  return [...allLinks].sort();
}

async function main(): Promise<void> {
  const years = [
    { base: "https://2021.rca.ac.uk", label: "RCA 2021" },
    { base: "https://2023.rca.ac.uk", label: "RCA 2023" },
    { base: "https://2024.rca.ac.uk", label: "RCA 2024" },
  ];

  for (const { base, label } of years) {
    const programmes = await discover(base, label);
    if (programmes.length > 0) {
      console.log(`\n  Real ${label} programmes:`);
      programmes.forEach((p) => {
        const name = p.split("/programmes/")[1]?.replace(/-ma\/?$/, "").replace(/-/g, " ") || p;
        console.log(`    { name: "${name} (MA)", url: "${p}", year: ${label.split(" ")[1]} },`);
      });
    } else {
      console.log(`  ⚠ No programmes found for ${label}`);
    }
  }
}

main();
