# Daily retailer observations

The GitHub Actions workflow `Daily retailer price checks` runs at 06:17 America/Toronto daily and can be run manually. No separately managed server or database write credential is required. GitHub may delay scheduled runs.

The public feed `public/retailer-prices.json` tracks the 600 researched products across Real Canadian Superstore, No Frills and Loblaws (1,800 observations). The app reads the latest feed directly from the public GitHub repository, falls back to its deployed copy when unavailable, and merges it with database observations by exact SKU, brand, product name, package and retailer. A newer database observation wins over an older feed record. Open pages refresh every 15 minutes. Feed updates do not require republishing Bolt.

The collector fetches the original public category listings starting from 42 source pages, following up to three additional pages when the source offers pagination and a SKU is missing, rather than repeatedly downloading 1,800 individual product pages. Each listing record must contain the exact product SKU, identity, package and matching retailer product link. Product detail pages currently do not consistently embed structured price data. Store scope stays `Website default; physical store unconfirmed`; these are not branch-specific stock or prices.

A successful check replaces standard and membership prices, promotions and observation time. Failed or ambiguous checks retain the previous price AND its original date, recording `needs_review` or `source_unavailable`. The page flags failed checks and observations older than 48 hours. Missing prices are never changed to zero. Job summary counts are stored in `last_run`. Partial failures are saved and then marked failed in Actions for visibility.

The feed supplements database rows; it does not change database import/export records or create verified branch offers. New catalog products need verified retailer links, exact package identities and source-listing URLs added to this feed before the daily collector can check them. Never add invented prices or update observation dates without a successful source check.

Validation: `python3 scripts/test-refresh-prices.py`, `npm test`, `npm run build`. To inspect the current check: GitHub repository → Actions → Daily retailer price checks. Keep repository scheduling enabled. Only this workflow needs contents-write access to save the public feed; it has no access to database service credentials.
