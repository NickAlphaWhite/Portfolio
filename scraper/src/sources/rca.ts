/**
 * RCA Graduate Showcase scraper — PROPER deep extraction.
 *
 * Auto-discovers programmes, then visits each student page to extract:
 *   - Full statement/description
 *   - Real image URLs (not just placeholders)
 *   - Project sections
 *   - Degree details
 *
 * Supports:
 *   - 2021/2023: /programmes/<name>-ma/
 *   - 2024:       /school/<name>-ma/  (different URL structure)
 */
import * as cheerio from "cheerio";
import type { RawScrapedItem, Category } from "../types.js";
import { fetchHTML, toPortfolioItem, replaceSourceItems } from "../utils.js";

interface Programme {
  name: string;
  url: string;
  year: number;
}

/**
 * Auto-discover programmes. Tries both /programmes/ (2021,2023) and /school/ (2024) patterns.
 */
async function discoverProgrammes(base: string, year: number): Promise<Programme[]> {
  const programmes: Programme[] = [];
  const seen = new Set<string>();

  // Try both URL patterns
  const tries = [`${base}/programmes/`, `${base}/school/`, base];

  for (const url of tries) {
    try {
      const html = await fetchHTML(url);
      const $ = cheerio.load(html);

      // Match both /programmes/xxx-ma/ and /school/xxx-ma/ patterns
      $('a[href*="-ma/"], a[href*="-ma-msc/"], a[href*="-mphil/"], a[href*="-mdes/"], a[href*="-mres/"]').each((_, el) => {
        const href = ($(el).attr("href") || "").trim();
        if (!href.startsWith("/")) return;

        const match = href.match(/\/(?:programmes|school)\/(.+?)\/?$/);
        if (!match) return;

        const slug = match[1];
        const name = slug
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .replace(/\bMa\b/, "MA")
          .replace(/\bMsc\b/, "MSc")
          .replace(/\bMdes\b/, "MDes")
          .replace(/\bMres\b/, "MRes")
          .replace(/\bMphil\b/, "MPhil")
          .replace(/\bPhd\b/, "PhD")
          .trim();

        if (!seen.has(name)) {
          seen.add(name);
          programmes.push({ name, url: `${base}${href}`, year });
        }
      });

      if (programmes.length > 0) {
        console.log(`  Auto-discovered ${programmes.length} programmes at ${url}`);
        break;
      }
    } catch {
      // try next URL pattern
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  return programmes;
}

function guessCategory(programme: string): Category {
  const p = programme.toLowerCase();
  if (p.includes("service") || p.includes("digital") || p.includes("innovation")) return "ui_ux";
  if (p.includes("product") || p.includes("engineering") || p.includes("mobility") || p.includes("healthcare")) return "industrial_design";
  if (p.includes("fashion") || p.includes("textile")) return "fashion";
  if (p.includes("architecture") || p.includes("city") || p.includes("environment")) return "architecture";
  if (p.includes("visual") || p.includes("communication") || p.includes("graphic")) return "graphic_design";
  if (p.includes("animation") || p.includes("film")) return "motion_graphics";
  if (p.includes("photo")) return "photography";
  if (p.includes("illustration") || p.includes("draw")) return "illustration";
  if (p.includes("art") || p.includes("sculpture") || p.includes("painting") || p.includes("print")) return "fine_art";
  return "mixed_media";
}

interface StudentPage {
  name: string;
  url: string;
  thumbnail: string;
  description: string;
  images: string[];
  programme: string;
  school: string;
}

/**
 * Scrape a student's profile page for all content.
 */
async function scrapeStudentPage(
  url: string,
  fallbackName: string,
  fallbackProgramme: string,
  base: string
): Promise<StudentPage | null> {
  try {
    const html = await fetchHTML(url, 20000);
    const $ = cheerio.load(html);

    // Student name
    const name = $("h1").first().text().trim() || fallbackName;

    // Description: collect Statement section + all rich text paragraphs
    const descParts: string[] = [];

    // Try .section-header "Statement" + next .row
    $(".section-header").each((_, el) => {
      const header = $(el).text().trim();
      if (header.toLowerCase().includes("statement")) {
        const nextRow = $(el).next(".row, .row--disable-border");
        const text = nextRow.text().trim();
        if (text && text.length > 30) descParts.push(text);
      }
    });

    // If no statement found, collect all meaningful paragraphs
    if (descParts.length === 0) {
      $("main p, article p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 40 && !text.includes("mailto:") && !text.includes("@")) {
          descParts.push(text);
        }
      });
    }

    const description = descParts.join("\n\n").slice(0, 2000);

    // Images: all real content images (exclude logos, icons, avatars)
    const images: string[] = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || "";
      if (!src) return;
      if (src.includes("logo") || src.includes("icon") || src.includes("avatar") || src.includes("emoji")) return;
      if (src.includes("/emoji/") || src.includes("wp-content/themes/rca-main/img/")) return;

      const full = src.startsWith("http") ? src
        : src.startsWith("//") ? `https:${src}`
        : `${base}${src.startsWith("/") ? "" : "/"}${src}`;
      if (!images.includes(full)) images.push(full);
    });

    // Thumbnail: first real image
    const thumbnail = images.length > 0 ? images[0] : "";

    // Programme info from degree details
    let programme = fallbackProgramme;
    const degreeSection = $(".section-header").filter((_, el) => $(el).text().trim().includes("Degree Details"));
    if (degreeSection.length > 0) {
      const nextRow = degreeSection.next(".row, .row--disable-border");
      const degreeText = nextRow.text().trim();
      // Extract programme name — usually the longest line
      const lines = degreeText.split("\n").map(l => l.trim()).filter(l => l.length > 3);
      if (lines.length >= 2) programme = lines[1]; // second line is usually the programme
    }

    // School
    let school = "Royal College of Art";
    $(".degree-details, .school, .faculty").each((_, el) => {
      const text = $(el).text().trim();
      if (text.includes("School of")) school = text.split("\n")[0]?.trim() || school;
    });

    return { name, url, thumbnail, description, images, programme, school };
  } catch {
    return null;
  }
}

interface StudentLink {
  name: string;
  url: string;
  image: string;
}

async function getStudentLinks(programmeUrl: string, base: string): Promise<StudentLink[]> {
  const html = await fetchHTML(programmeUrl);
  const $ = cheerio.load(html);
  const students: StudentLink[] = [];
  const seen = new Set<string>();

  $('a[href*="/students/"]').each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    const text = $(el).find("h2, h3, .name").first().text().trim() || $(el).text().trim();
    const img = $(el).find("img").first().attr("src") || "";

    if (href && text.length > 2 && !seen.has(href)) {
      seen.add(href);
      const fullUrl = href.startsWith("http") ? href : `${base}${href.startsWith("/") ? "" : "/"}${href}`;
      const fullImg = img.startsWith("http") ? img : img ? `${base}${img}` : "";
      students.push({ name: text, url: fullUrl, image: fullImg });
    }
  });

  return students;
}

async function scrapeProgrammes(
  programmes: Programme[],
  base: string
): Promise<RawScrapedItem[]> {
  const rawItems: RawScrapedItem[] = [];

  for (const prog of programmes) {
    console.log(`\n  ▶ ${prog.name} (${prog.year})`);
    try {
      const students = await getStudentLinks(prog.url, base);
      console.log(`    Found ${students.length} students`);

      const limit = Math.min(students.length, 15);
      let done = 0;
      for (const s of students.slice(0, limit)) {
        const page = await scrapeStudentPage(s.url, s.name, prog.name, base);
        if (page) {
          rawItems.push({
            source: "rca",
            source_url: s.url,
            title: page.name,
            description: page.description,
            author_name: page.name,
            thumbnail_url: page.thumbnail || s.image,
            images: page.images.slice(0, 15),
            tags: ["rca", "graduate", `class_of_${prog.year}`],
            year: prog.year,
            institution: "Royal College of Art",
            program: page.programme || prog.name,
            category: guessCategory(prog.name),
            is_featured: false,
            aspect_ratio: 1.5,
          });
        }
        done++;
        if (done % 10 === 0) console.log(`      ${done}/${limit}`);
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (err) {
      console.error(`    Failed:`, err);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  return rawItems;
}

async function main(): Promise<void> {
  console.log("=== RCA Scraper — Auto-discovery + Deep extraction ===\n");

  const years = [
    { base: "https://2021.rca.ac.uk", year: 2021 },
    { base: "https://2023.rca.ac.uk", year: 2023 },
    { base: "https://2024.rca.ac.uk", year: 2024 },
  ];

  const allRaw: RawScrapedItem[] = [];

  for (const { base, year } of years) {
    console.log(`\n--- RCA ${year}: Discovering programmes ---`);
    const programmes = await discoverProgrammes(base, year);
    if (programmes.length === 0) {
      // Fallback: use known real programmes when auto-discovery fails
      const fallbacks: Record<number, string[]> = {
        2021: ["design-products-ma","fashion-ma","global-innovation-design-ma","innovation-design-engineering-ma","intelligent-mobility-ma","service-design-ma","textiles-ma"],
        2023: ["design-products-ma","fashion-ma","global-innovation-design-ma","intelligent-mobility-ma","service-design-ma","textiles-ma"],
        2024: ["design-mphil-phd","design-futures-mdes","design-products-ma","fashion-ma","global-innovation-design-ma-msc","healthcare-design-mres","innovation-design-engineering-ma-msc","service-design-ma","textiles-ma"],
      };
      const slugs = fallbacks[year];
      if (slugs) {
        // 2024 uses /school/, others use /programmes/
        const prefix = year === 2024 ? "/school/" : "/programmes/";
        for (const slug of slugs) {
          const name = slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
            .replace(/\bMa\b/, "MA").replace(/\bMsc\b/i, "MSc").replace(/\bMdes\b/i, "MDes")
            .replace(/\bMres\b/i, "MRes").replace(/\bMphil\b/i, "MPhil").replace(/\bPhd\b/i, "PhD");
          programmes.push({ name, url: `${base}${prefix}${slug}/`, year });
        }
        console.log(`  Using fallback: ${programmes.length} programmes`);
      } else {
        console.log(`  ⚠ No programmes for ${year}`);
        continue;
      }
    }
    console.log(`  ${programmes.map(p => p.name).join(", ")}`);

    const items = await scrapeProgrammes(programmes, base);
    console.log(`  ✅ ${year}: ${items.length} students`);
    allRaw.push(...items);
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (allRaw.length === 0) {
    console.log("\nNo items found.");
    return;
  }

  const items = allRaw.map(toPortfolioItem);
  replaceSourceItems("rca", items);
  console.log(`\n✅ Complete: ${items.length} students with real descriptions & images`);
}

main();
