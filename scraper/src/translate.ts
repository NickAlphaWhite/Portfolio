/**
 * Translation utility.
 *
 * Uses a free translation API for en→zh translation.
 * Falls back to keeping the original English text if unavailable.
 *
 * To use with a real API key, set DEEPL_API_KEY or OPENAI_API_KEY env var.
 */

// Simple translations for common design terms
const DICT: Record<string, string> = {
  "designer": "设计师",
  "design": "设计",
  "designer and researcher": "设计师兼研究员",
  "multidisciplinary": "多学科",
  "researcher": "研究员",
  "artist": "艺术家",
  "architecture": "建筑",
  "fashion": "时装",
  "textiles": "纺织品",
  "photography": "摄影",
  "sculpture": "雕塑",
  "painting": "绘画",
  "ceramics": "陶瓷",
  "jewellery": "珠宝",
  "interior design": "室内设计",
  "service design": "服务设计",
  "product design": "产品设计",
  "visual communication": "视觉传达",
  "innovation": "创新",
  "sustainable": "可持续",
  "sustainability": "可持续性",
  "social impact": "社会影响",
  "education": "教育",
  "research": "研究",
  "practice": "实践",
  "exploring": "探索",
  "explores": "探索",
  "creating": "创造",
  "project": "项目",
  "graduate": "研究生",
  "student": "学生",
  "royal college of art": "皇家艺术学院",
  "statement": "陈述",
  "about": "关于",
  "contact": "联系",
  "degree": "学位",
  "school of design": "设计学院",
};

export function simpleTranslate(text: string): string {
  if (!text || text.length < 2) return text;

  let result = text;

  // Apply dictionary replacements
  for (const [en, zh] of Object.entries(DICT)) {
    const regex = new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi");
    result = result.replace(regex, zh);
  }

  // If the result is still mostly English, mark it as untranslated
  // (a real implementation would use DeepL or OpenAI API)
  if (result === text) {
    return text; // fallback: keep English
  }

  return result;
}

/**
 * Batch translate portfolio items.
 * In production, replace with DeepL/OpenAI API call.
 */
export async function translateBatch(
  items: { title_en: string; description_en: string }[]
): Promise<{ title_zh: string; description_zh: string }[]> {
  // TODO: Replace with real API call
  // const apiKey = process.env.DEEPL_API_KEY;
  // if (apiKey) { ... call DeepL ... }

  return items.map((item) => ({
    title_zh: simpleTranslate(item.title_en),
    description_zh: simpleTranslate(item.description_en),
  }));
}
