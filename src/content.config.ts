import { defineCollection } from "astro:content";
import { file } from "astro/loaders";

const items = defineCollection({
  loader: file("src/content/items/data.json", {
    parser: (text) => JSON.parse(text),
  }),
});

export const collections = { items };
