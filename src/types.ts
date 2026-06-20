export type Category =
  | "graphic_design"
  | "ui_ux"
  | "industrial_design"
  | "illustration"
  | "motion_graphics"
  | "photography"
  | "fashion"
  | "architecture"
  | "fine_art"
  | "mixed_media";

export const CATEGORY_LABELS: Record<Category, { en: string; zh: string }> = {
  graphic_design: { en: "Graphic Design", zh: "平面设计" },
  ui_ux: { en: "UI/UX", zh: "界面体验" },
  industrial_design: { en: "Industrial Design", zh: "工业设计" },
  illustration: { en: "Illustration", zh: "插画" },
  motion_graphics: { en: "Motion Graphics", zh: "动态图形" },
  photography: { en: "Photography", zh: "摄影" },
  fashion: { en: "Fashion", zh: "时装" },
  architecture: { en: "Architecture", zh: "建筑" },
  fine_art: { en: "Fine Art", zh: "纯艺术" },
  mixed_media: { en: "Mixed Media", zh: "混合媒介" },
};

export interface PortfolioItem {
  id: string;
  source: string;
  source_url: string;
  scraped_at: string;

  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  author_name_en: string;
  author_name_zh: string;

  thumbnail: string;
  images: string[];

  category: Category;
  tags: string[];
  year: number;
  institution: string;
  program: string;

  is_featured: boolean;
  aspect_ratio: number;
}
