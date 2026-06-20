/**
 * Generate attractive placeholder images for all portfolio items.
 * Each card gets a unique gradient background with the item's initials.
 * Items with real external images keep them; this generates LOCAL fallbacks.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const DATA_PATH = path.resolve(import.meta.dirname, "../src/content/items/data.json");
const IMAGES_DIR = path.resolve(import.meta.dirname, "../public/images/items");

interface Item {
  id: string;
  title_en: string;
  source: string;
  institution: string;
  category: string;
  thumbnail: string;
}

const CATEGORY_PALETTES: Record<string, [string, string]> = {
  graphic_design: ["#FF6B6B", "#FFE66D"],
  ui_ux: ["#4ECDC4", "#45B7D1"],
  industrial_design: ["#F7DC6F", "#F39C12"],
  illustration: ["#A29BFE", "#6C5CE7"],
  motion_graphics: ["#00B894", "#00CEC9"],
  photography: ["#2D3436", "#636E72"],
  fashion: ["#FD79A8", "#E84393"],
  architecture: ["#74B9FF", "#0984E3"],
  fine_art: ["#E17055", "#D63031"],
  mixed_media: ["#A3CB38", "#6AB04C"],
};

function getInitials(title: string): string {
  const words = title.split(/\s+/).filter(w => w.length > 1 && !/^[^a-zA-Z]/.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return title.slice(0, 2).toUpperCase();
}

function generateCardSVG(item: Item): string {
  const [color1, color2] = CATEGORY_PALETTES[item.category] || CATEGORY_PALETTES.mixed_media;
  const initials = getInitials(item.title_en);

  // Use item id as seed for deterministic gradient angle
  const seed = (item.id || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const angle = 135 + (seed % 90);

  // Source label
  const sourceLabels: Record<string, string> = {
    rca: "Royal College of Art",
    ual_lcc: "UAL London",
    mit_media_lab: "MIT Media Lab",
    cmu_design: "Carnegie Mellon",
    yankodesign: "Yanko Design",
    dezeen: "Dezeen",
    core77_awards: "Core77 Awards",
    nyu_itp: "NYU ITP",
    risd: "RISD",
  };
  const sourceLabel = sourceLabels[item.source] || item.institution.split(" ").map(w => w[0]).join("").slice(0, 6);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:0.9"/>
      <stop offset="100%" style="stop-color:${color2};stop-opacity:0.85"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bg)" rx="0"/>
  <!-- Decorative circles -->
  <circle cx="85%" cy="15%" r="120" fill="rgba(255,255,255,0.07)"/>
  <circle cx="15%" cy="85%" r="80" fill="rgba(0,0,0,0.04)"/>
  <!-- Source badge -->
  <rect x="24" y="24" width="auto" height="28" rx="6" fill="rgba(0,0,0,0.2)"/>
  <text x="40" y="44" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="rgba(255,255,255,0.8)" letter-spacing="0.04em">${sourceLabel}</text>
  <!-- Initials -->
  <text x="50%" y="55%" text-anchor="middle" font-family="system-ui, sans-serif" font-size="72" font-weight="700" fill="rgba(255,255,255,0.85)" letter-spacing="0.02em">${initials}</text>
  <!-- Title at bottom -->
  <text x="50%" y="88%" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="500" fill="rgba(255,255,255,0.6)">
    <tspan x="50%" dy="0">${item.title_en.slice(0, 60)}</tspan>
  </text>
</svg>`;
}

function main(): void {
  if (!fs.existsSync(DATA_PATH)) {
    console.error("data.json not found");
    process.exit(1);
  }

  const items: Item[] = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  // Also generate a generic placeholder for fallback
  const genericSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <rect width="800" height="500" fill="#E8E8ED"/>
  <text x="50%" y="55%" text-anchor="middle" font-family="system-ui" font-size="48" fill="#AEAEB2">No Image</text>
</svg>`;
  fs.writeFileSync(path.join(IMAGES_DIR, "_placeholder.svg"), genericSvg, "utf-8");

  let generated = 0;
  let skipped = 0;

  for (const item of items) {
    const filePath = path.join(IMAGES_DIR, `${item.id}.svg`);

    // Always generate local SVG (external URLs are unreliable)
    const svg = generateCardSVG(item);
    fs.writeFileSync(filePath, svg, "utf-8");
    generated++;
  }

  console.log(`Generated: ${generated} placeholders, Skipped: ${skipped} (has external image)`);
  console.log(`Total items: ${items.length}, Images in public/images/items/`);
}

main();
