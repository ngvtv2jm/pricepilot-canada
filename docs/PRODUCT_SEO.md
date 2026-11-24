# Product linking and sourced descriptions

Product pages and comparison views show up to six relevant products. Recommendations require a matching product type or at least two meaningful shared name terms. The current product, merged aliases and brand-only matches are excluded. Packages remain distinct. All published product links use their canonical clean URLs.

Static product pages link to product-type and brand hubs, use product-name anchors and include BreadcrumbList structured data. Hub pages paginate at 100 products, link back to the directory and are included in the sitemap. The footer links to both hub indexes. No ranking or indexing guarantee is made.

## GitHub research

Workflow: `.github/workflows/enrich-descriptions.yml` — **Research product descriptions**.

- Runs at 8:47 a.m. America/Toronto, after successful daily catalog maintenance, on manual workflow dispatch, and when its source files change on main.
- Reads both the original database snapshot and discovered catalog, with exact retailer product links from the price observations.
- Processes at most 1,000 queued products within an approximately 20-minute research budget. New/missing products are prioritized; verified entries are eligible for rechecking after 30 days. Failed attempts rotate behind untouched items. All existing and future records are eligible; a single run does not complete the whole catalog.
- Validates retailer host, SKU, product name, available brand and package data. Only supported public retailer listings are fetched. Normal browser rendering is available for client-rendered pages; challenges are not bypassed.
- Stores a short attributed retailer excerpt with product identity/package facts, source URL, retailer and check date. It does not invent features, dietary, medical, certification or availability claims.
- Writes `public/product-descriptions.json`, per-product files in `public/product-descriptions/`, and `public/description-status.json`. An unsuccessful check retains the previous verified description.
- Admin offers a direct link to the workflow and displays researched, missing, queued and failed counts.

The application reads the live GitHub description feed. Published static product pages can update their visible description, attribution, description metadata and Product JSON-LD from the per-product GitHub file without another Bolt deployment. Each production build also includes the latest locally available research as rendered HTML. Availability of the external feed and search-engine rendering is outside the application's control. Newly discovered products get static pages and navigation hubs on the next website build.

Initial local source smoke test checked three legacy products. No usable description was confirmed in their server HTML; no synthetic description was saved. The initial GitHub run must be checked separately. Empty or blocked sources remain explicitly queued for further research.

Reference: https://developers.google.com/search/docs/crawling-indexing/links-crawlable and https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure
