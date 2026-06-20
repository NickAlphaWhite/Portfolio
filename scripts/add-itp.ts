import * as fs from "node:fs";
import * as path from "node:path";

const DATA_PATH = path.resolve(import.meta.dirname, "../src/content/items/data.json");

const names = `Adam Krebs
Aike Akhigbe
Akshita Bawa
Alan Winslow
Allie Yu
Ami Mehta
Anh Lê
Bowei Xu
Bomani Oseni McClendon
Brandon Roots
Casta Zhu
Charlin Wu
Chaski No
Clover Zhou
Dalit Steinbrecher
Daniel Rautenbach
Daniel Ryan Johnston
David Alexander Leyva
David Currie
Divya Mehra
Donnan Dai
Duncan Figurski
Eamon Goodman
Echo Tang
Eden Chinn
Elias Jarzombek
En-Tung Liu
Eric Kalb
Esther Zhang
Funzo Cheng
Gabi Branco
George Liu
Henry Haoyu Wang
Hyun Yang
Ibrahim Hashmat
Jack Chen
Jahnavi shah
Jane Meng
Jason Gao
Jeeyoon Hyun
Jenny Wang
Jezzy Zheng Lu
Jingyao Shao
John Bezark
Junoh Yu
Jung Huh
Kevin Peter He
Kseniia Balaenkova
Lauren Chong
Ling-Hsuan Wang
Liraz Primo
Lucas Wozniak
Magdalena Claro
Marcel Wang
MeeNa Ko
Michael Zhou
Mingxi Xu
Minjun Kim
Minyoung Bang
Morgan Chen
Nako Shigesada
Natalie Fajardo
Nicholas Boss
Nick Parisi
Pauline Okuda Ceraulo
Phil Caridi
Philip Cadoux
Philip Lee
Qiuyu Guo
Rachel Wang
Rajshree Saraf
Rebecca Melman
Sara Ro
Sam Heckle
Sean Zhu
Shannon Hu
Shaurya Seth
Shinnosuke Komiya
Shira Seri Levi
Stephanie Chen
Stuti Mohgaonkar
Sumi Lee
Tiange Hou
Tianyi Shi
Tinrey Wang
Todd Whitney
Tora Thuland
Victoria Baik
Viola He
Vivien Kong
Wasif Hyder
Weiwei Zhou
Wyatt Zhu
Yihan Zhao
Yilin Zou
Yona Ngo
Yonatan Rozin
Youming Zhang
Zack Kampf
Zairan Liu
Zi Xun Meng`.split("\n").map(n => n.trim()).filter(n => n.length > 2);

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

const items = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
// Remove old ITP items
const filtered = items.filter((i: any) => i.source !== "nyu_itp");

const today = new Date().toISOString();

for (const name of names) {
  const slug = slugify(name);
  const id = `nyu_itp_${slug}_2022`.slice(0, 80);

  filtered.push({
    id,
    source: "nyu_itp",
    source_url: `https://itp.nyu.edu/thesis/2022/?${slug}`,
    scraped_at: today,
    title_en: name,
    title_zh: name, // will be translated later
    description_en: `NYU ITP Thesis 2022 — ${name}`,
    description_zh: `NYU ITP 2022 届毕业论文 — ${name}`,
    author_name_en: name,
    author_name_zh: name,
    thumbnail: "",
    images: [],
    category: "mixed_media",
    tags: ["nyu", "itp", "thesis", "2022"],
    year: 2022,
    institution: "New York University",
    program: "Interactive Telecommunications Program (ITP)",
    is_featured: false,
    aspect_ratio: 1.5,
  });
}

filtered.sort((a: any, b: any) => b.year - a.year || a.title_en.localeCompare(b.title_en));
fs.writeFileSync(DATA_PATH, JSON.stringify(filtered, null, 2), "utf-8");
console.log(`Added ${names.length} ITP students. Total: ${filtered.length}`);
