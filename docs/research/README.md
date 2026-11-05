# Product research register

Before researching each requested batch, read all prior batch CSVs in this directory and the current catalog export/database. Exclude products already collected, even if the user has not uploaded them yet. Compare barcode first, then canonical source product URL, then brand + name + exact size for ambiguous matches. Do not invent barcodes, prices, permission or image URLs.

Save each delivered research CSV here as batch-YYYY-MM-DD-NNN.csv as well as providing the user a downloadable file. Use the app CSV template columns. Preserve verified source_url and image_url; mark missing values blank. Add a manifest entry with batch filename, collection date, count and source coverage. Never mark a batch imported solely because it was delivered.

## Delivered batches

- 2026-11-05: batch-2026-11-05-001.csv. 100 distinct packaged products: 50 cereal/breakfast and 50 dairy/eggs department listings (including refrigerated dough). Status: delivered, NOT imported. Current catalog and import ledger both had 0 rows when checked.
- Companion batch-2026-11-05-001-prices.csv: 300 observations, each product matched at Real Canadian Superstore, No Frills and Loblaws. All are Loblaw banners. Match basis: shared retailer-group SKU plus identical brand, title and package size. SKUs are NOT barcodes. GTINs unavailable and left blank.
- Prices are public website snapshots collected 2026-11-05. Physical store/location unconfirmed; not national price guarantees. Availability unverified. Promotions and member prices are separate from the displayed single-unit price. Taxes, deposits and delivery charges are not computed. Product and listing source URLs and collection timestamps are included per observation.
- The product CSV imports catalog details only. The price CSV is research data and is not accepted by the current product importer. Price publication needs store scope and the offers import workflow.
- All 100 product rows include source image URLs. Six sampled URLs returned HTTP 200 with image content types. Image reuse rights unverified; source_license blank.

- 2026-11-05 batch 002: 500 additional products, 1,500 observations across the same three retailers; zero overlap with batch 001. Files: batch-2026-11-05-002.csv and batch-2026-11-05-002-prices.csv. Original retailer image URLs retained; 500 cached images validated and delivered in ZIP. Status: delivered research, NOT imported. Same website-default price and licensing limitations apply.
