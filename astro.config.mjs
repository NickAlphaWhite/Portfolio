import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://nickalphawhite.github.io",
  base: "/Portfolio",
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh"],
    routing: {
      prefixDefaultLocale: true,
    },
  },
  build: {
    assets: "assets",
  },
});
