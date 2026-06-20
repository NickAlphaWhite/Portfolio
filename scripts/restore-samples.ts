import * as fs from "node:fs";
import * as path from "node:path";

const DATA_PATH = path.resolve(
  import.meta.dirname,
  "../src/content/items/data.json"
);

const missing = [
  {
    "id": "rca_jane_doe_2024",
    "source": "rca",
    "source_url": "https://2021.rca.ac.uk/students/jane-doe/",
    "scraped_at": "2026-06-15T10:30:00Z",
    "title_en": "Sensory Cartography",
    "title_zh": "感官制图学",
    "description_en": "An interactive installation exploring how we map emotional landscapes through tactile and auditory feedback. The project combines data sonification with physical computing to create immersive spatial narratives.",
    "description_zh": "一个互动装置，探索我们如何通过触觉和听觉反馈绘制情感地图。项目结合了数据声化和物理计算，创造沉浸式的空间叙事。",
    "author_name_en": "Jane Doe",
    "author_name_zh": "简·多伊",
    "thumbnail": "/portfolio-inspiration/images/items/rca_jane_doe_2024.svg",
    "images": [],
    "category": "mixed_media",
    "tags": ["installation", "interactive", "data_visualization", "sound"],
    "year": 2024,
    "institution": "Royal College of Art",
    "program": "MA Information Experience Design",
    "is_featured": true,
    "aspect_ratio": 1.5
  },
  {
    "id": "rca_tom_brown_2025",
    "source": "rca",
    "source_url": "https://2023.rca.ac.uk/students/tom-brown/",
    "scraped_at": "2026-06-15T10:33:00Z",
    "title_en": "Ecology of Materials",
    "title_zh": "材料生态学",
    "description_en": "An investigation into biodegradable materials for product design, featuring a series of objects made from mycelium, algae-based bioplastics, and reclaimed ocean plastics. Each piece documents its own decomposition timeline.",
    "description_zh": "对产品设计中可生物降解材料的探索，展示了一系列由菌丝体、藻类生物塑料和回收海洋塑料制成的物品。每件作品都记录了自己的降解时间线。",
    "author_name_en": "Tom Brown",
    "author_name_zh": "汤姆·布朗",
    "thumbnail": "/portfolio-inspiration/images/items/rca_tom_brown_2025.svg",
    "images": [],
    "category": "industrial_design",
    "tags": ["sustainability", "materials", "bioplastic", "circular_design"],
    "year": 2025,
    "institution": "Royal College of Art",
    "program": "MA Design Products",
    "is_featured": true,
    "aspect_ratio": 1
  },
  {
    "id": "rca_olivia_zhang_2025",
    "source": "rca",
    "source_url": "https://2023.rca.ac.uk/students/olivia-zhang/",
    "scraped_at": "2026-06-15T10:38:00Z",
    "title_en": "Digital Memorials — Designing for Grief",
    "title_zh": "数字纪念馆 — 为哀悼而设计",
    "description_en": "A speculative design project exploring how digital spaces can accommodate grief and remembrance. Proposes a series of virtual environments where memories can be preserved, shared, and visited.",
    "description_zh": "一个思辨设计项目，探索数字空间如何承载哀悼和纪念。提出了一系列可以保存、分享和访问记忆的虚拟环境。",
    "author_name_en": "Olivia Zhang",
    "author_name_zh": "张奥利维亚",
    "thumbnail": "/portfolio-inspiration/images/items/rca_olivia_zhang_2025.svg",
    "images": [],
    "category": "ui_ux",
    "tags": ["speculative", "ux", "vr", "social_impact", "death_tech"],
    "year": 2025,
    "institution": "Royal College of Art",
    "program": "MA Digital Direction",
    "is_featured": true,
    "aspect_ratio": 1.78
  }
];

const items = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
const existingIds = new Set(items.map((i: any) => i.id));

let added = 0;
for (const item of missing) {
  if (!existingIds.has(item.id)) {
    items.unshift(item);
    existingIds.add(item.id);
    added++;
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
console.log(`Restored ${added} sample items (total: ${items.length})`);
