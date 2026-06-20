# Portfolio Scraper

Scrapes portfolio inspiration data from top design schools and competitions.

## Sources

| Source | URL | Scraper |
|--------|-----|---------|
| RCA Showcase | rca.ac.uk/showcase | `sources/rca.ts` |
| MIT Media Lab | media.mit.edu/projects | `sources/mit.ts` |
| CMU Design | design.cmu.edu/student-work | `sources/cmu.ts` |
| Designboom | designboom.com/competitions | `sources/designboom.ts` |
| It's Nice That | itsnicethat.com | `sources/itsnicethat.ts` |
| ADC Awards | adcawards.org/projects | `sources/adc.ts` |

## Setup

```bash
cd scraper
npm install
```

## Usage

```bash
# Run all scrapers
npm run scrape

# Run individual scrapers
npm run scrape:rca
npm run scrape:mit
npm run scrape:cmu
npm run scrape:designboom
npm run scrape:itsnicethat
npm run scrape:adc
```

## Output

Scraped data is written to `src/content/items/data.json`, matching the `PortfolioItem` schema.
Scrapers skip duplicates by checking existing item IDs.

## Adding a new source

1. Create `src/sources/<name>.ts`
2. Export a `main()` function that:
   - Fetches HTML with `fetchHTML(url)`
   - Parses with cheerio
   - Converts raw items via `toPortfolioItem(raw)`
   - Writes via `writeItems(items)`
3. Add the source to `src/index.ts`

## Notes

- Chinese translations are placeholder — integrate a translation API (e.g. DeepL, OpenAI) for production
- Thumbnail images must be downloaded separately — see `scripts/download-images.ts`
- Sites change their HTML structure over time. If scraping returns 0 results, inspect the page structure
  and update the CSS selectors in the source file. Use `--debug` mode where supported.
