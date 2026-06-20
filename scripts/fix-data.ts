import * as fs from "node:fs";
import * as path from "node:path";

const DATA_PATH = path.resolve(import.meta.dirname, "../src/content/items/data.json");
const items = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

console.log("Before:", items.length);

// Remove items with suspicious/missing titles
const cleaned = items.filter((i: any) => {
  const t = (i.title_en || "").trim();
  // Too short
  if (t.length < 5) {
    console.log(`  REMOVE (short): [${i.source}] "${t}"`);
    return false;
  }
  // Title is just the program name with no real description
  const programNames = /^(architecture|design products|fashion|textiles|service design|photography|painting|sculpture|print|jewellery|ceramics|interior design|city design|environmental architecture|global innovation design|innovation design engineering|intelligent mobility|digital direction|visual communication|animation|writing|curating contemporary art|history of design|design futures|design mphil|healthcare design)(\s*\(?(ma|msc|mdes|mres|mphil|phd)\)?)?$/i;
  if (programNames.test(t) && (!i.description_en || i.description_en.length < 20)) {
    console.log(`  REMOVE (category): [${i.source}] "${t}"`);
    return false;
  }
  return true;
});

fs.writeFileSync(DATA_PATH, JSON.stringify(cleaned, null, 2), "utf-8");
console.log(`After: ${cleaned.length} (removed ${items.length - cleaned.length})`);

// Show source breakdown
const bySource: Record<string, number> = {};
cleaned.forEach((i: any) => { bySource[i.source] = (bySource[i.source] || 0) + 1; });
console.log("\nSources:");
Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
  const withImg = cleaned.filter((i: any) => i.source === s && i.thumbnail?.startsWith("http")).length;
  console.log(`  ${s}: ${c} (img: ${withImg})`);
});
