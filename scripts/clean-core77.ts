import * as fs from "node:fs";
import * as path from "node:path";

const DATA_PATH = path.resolve(import.meta.dirname, "../src/content/items/data.json");
const items = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

const core77 = items.filter((i: any) => i.source === "core77_awards");
console.log("Core77 total:", core77.length);

// Real projects have URLs like /speculative-design/106381/PROTEUS
const isRealProject = (url: string) => /\/\d{4,}\//.test(url);

const real = core77.filter((i: any) => isRealProject(i.source_url));
const fake = core77.filter((i: any) => !isRealProject(i.source_url));

console.log("Real projects:", real.length);
console.log("Category pages to remove:", fake.length);
fake.forEach((i: any) => console.log("  REMOVE:", i.title_en, "|", i.source_url.slice(0, 70)));

const clean = items.filter((i: any) => i.source !== "core77_awards" || isRealProject(i.source_url));
fs.writeFileSync(DATA_PATH, JSON.stringify(clean, null, 2), "utf-8");
console.log("\nBefore:", items.length, "-> After:", clean.length);
