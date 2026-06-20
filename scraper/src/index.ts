/**
 * Portfolio Scraper — Main Entry Point
 *
 * Orchestrates scraping from all configured sources.
 * Run with: npx tsx src/index.ts
 */
import { readExisting } from "./utils.js";

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   Portfolio Inspiration Scraper     ║");
  console.log("╚══════════════════════════════════════╝\n");

  const existing = readExisting();
  console.log(`Existing items in data.json: ${existing.length}\n`);

  const sources = [
    { name: "RCA Graduate Showcase (2021/2023/2024)", path: "./sources/rca.js" },
    { name: "CMU Design", path: "./sources/cmu.js" },
    { name: "MIT Media Lab", path: "./sources/mit.js" },
    { name: "Core77 Design Awards", path: "./sources/core77.js" },
    { name: "Yanko Design", path: "./sources/yankodesign.js" },
    { name: "Dezeen", path: "./sources/dezeen.js" },
    { name: "Manamana (中国平台)", path: "./sources/manamana.js" },
    { name: "UAL - London College of Communication", path: "./sources/ual.js" },
    { name: "NYU ITP Thesis 2022", path: "./sources/nyu-itp.js" },
    { name: "RISD", path: "./sources/risd.js" },
  ];

  for (const source of sources) {
    console.log(`\n▶ Scraping ${source.name}...`);
    try {
      await import(source.path);
    } catch (err) {
      console.error(`  ✗ Failed to scrape ${source.name}:`, err);
    }
    // Polite delay between sources
    await new Promise((r) => setTimeout(r, 2000));
  }

  const updated = readExisting();
  const added = updated.length - existing.length;
  console.log(`\n✅ Scrape complete! ${added} new items added (total: ${updated.length})`);
}

main();
