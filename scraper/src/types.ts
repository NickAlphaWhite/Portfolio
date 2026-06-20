// Shared types — mirrors src/types.ts PortfolioItem schema
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

// A scraped item before translation
export interface RawScrapedItem {
  source: string;
  source_url: string;
  title: string;
  description: string;
  author_name: string;
  thumbnail_url: string;
  images: string[];
  tags: string[];
  year: number;
  institution: string;
  program: string;
  category: Category;
  is_featured: boolean;
  aspect_ratio: number;
}
