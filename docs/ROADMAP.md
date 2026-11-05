# PricePilot Canada delivery status

Retailer source configuration is intentionally last, per owner instruction.

| Phase | Implemented in this increment | Remaining gate |
|---|---|---|
| 0 Inventory | Repository and schema reviewed; risk and launch gaps documented | Recheck before production launch |
| 1 App and accounts | Responsive navigation, account signup/signin/reset, error states | Connected auth smoke test, owner registration |
| 2 Database/import | Additional permissions migration; no live sources configured | Apply migration, configure authorized sources LAST; importer/scheduler |
| 3 Catalog | Admin product/category/brand/store/variant forms, barcode and retailer-product matching, multi-image upload/reorder | Assign verified owner admin; connected CRUD tests |
| 4 Comparison | Store-specific offers, exact variants, unit prices, observed history | Verify with permitted source records |
| 5 Basket | Persistent guest list, private cloud lists, quantities, purchased state, export, one-store and split-store totals | Connected list isolation tests |
| 6 Dashboard/alerts | Account list controls and in-app target-price watches | Email/push delivery configuration |
| 7 Admin | Restricted admin route, catalog editor, unmatched counts and import monitor | Operational monitoring/ingestion jobs after source setup |
| 8 SEO | Static information pages, metadata, branded social card, WebSite schema, sitemap generation | Final origin; crawlable product routes and per-product social metadata; remove staging noindex only at launch |
| 9 Monetization | No billing or advertising enabled | Provider/account decisions and billing implementation |
| 10 Other categories | Category hierarchy and generic product variants support expansion | Electronics-specific attributes and comparison UX |
| 11 QA/release | TypeScript + production build; seven pricing/domain regression tests | Connected UI/security smoke tests; monitoring, privacy-contact/account-deletion process; production launch |

## Important limitations
- No fabricated retailer data. Empty states are intentional until sources are configured.
- Catalog queries currently cap each table at 1,000 records; server pagination/search is required before large feeds.
- No distance claims: postal code is saved, but distance filtering awaits geographic source configuration.
- Price watches are in-app only. No emails or push alerts are sent.
- Comparison excludes taxes, deposits, fees and travel costs; incomplete baskets are never labeled complete.
- Public launch indexing is disabled until launch gaps are addressed.
