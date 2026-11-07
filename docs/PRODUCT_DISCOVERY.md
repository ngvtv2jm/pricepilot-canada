# Automatic product discovery

The GitHub Actions workflow `discover-products.yml` runs daily at 07:17 America/Toronto, or manually through **Admin → Find products, prices & images — open GitHub → Run workflow** (main branch). GitHub can delay scheduled starts. The account triggering a manual run needs repository write access. No GitHub credential is stored in the website.

The workflow publishes discovery, baseline price refresh, website comparisons and image cache together. Discovery produces `public/discovered-catalog.json` and `public/discovery-status.json`. The website fetches the current public GitHub feed on load and every 15 minutes, with its deployed file as a fallback. New products appear without another website deployment after the initial frontend integration is published.

This is a public catalog feed, as selected by the owner, not a database writer. Database editing, CSV exports, account foreign keys and account price watches continue to use database products. Feed-only items can be saved as shopping-list labels in signed-in lists; no synthetic IDs are sent to database foreign keys. Guest lists can retain their feed identifiers. Exact matches to database products use the database IDs and preserve account features.

## Sources and bounds

Active HTTP adapters: Real Canadian Superstore, No Frills, Loblaws public category `__NEXT_DATA__`; Giant Tiger public Shopify collection product feeds. New discovery rotates category pages, revisits known source pages, limits concurrency to three requests and pauses between requests. Limits: 250 new products per run, 100 per retailer per run, 160 source pages, 20,000 feed products. Unknown package sizes and weighted prices are skipped. These are website observations, not verified branch inventory.

`source-audit.yml` is a separate, manually runnable investigation of FreshCo, Canadian Tire and Walmart using a normal browser. Its output is not automatically treated as an import source. A retailer is enabled only after a validated adapter exists. Identity challenges and access restrictions are not bypassed.

## Identity and price safeguards

- Retailer SKU is scoped to its retailer; the three PC stores share their exact PC SKU namespace.
- Valid GTIN checksums, when a source supplies barcodes, support matching; ambiguous or conflicting package data is skipped.
- Exact normalized brand, product name and package expression can reuse an existing product. Multipacks are preserved; 2 x 500 g is not merged into a single 1 kg package.
- The website also matches against the current database before adding cards. Ambiguous matches are not merged.
- Re-running the same inputs updates observations without creating products again.
- Invalid price, mismatched URL/SKU, changed title/package or contradictory duplicate observations are rejected.
- Failed refreshes keep the last price AND its original observation timestamp, with a warning status. Reports separate validated observations from failed sources.
- Feed output is public product data only. No customer data, tokens or database credentials are included.

## Checks

`python3 scripts/test-discover-products.py`, `npm test`, `npm run build`.

The Admin report shows additions, duplicate updates, conflicts and source results. Use GitHub's run page to distinguish a completed feed update from a job that failed before publishing. An empty new-product count can be normal when no unseen exact packages are found.

See [Nearby branches](NEARBY_BRANCHES.md) for the separate location directory and limitations on branch price and stock coverage.
