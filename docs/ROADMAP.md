# Phase 0–11 delivery roadmap

| Phase | Deliverable | Status |
|---|---|---|
| 0 | Formal triage, inventory, risk register | Initial inspection done |
| 1 | Responsive site, routing, authentication | Frontend prototype only |
| 2 | Authorized feeds, importer, database | Not started |
| 3 | Canonical product matching and Product Studio | Not started |
| 4 | Store-specific comparison and price history | Not started |
| 5 | Shopping basket optimization | Session-only list prototype |
| 6 | Customer dashboard, alerts | Not started |
| 7 | Admin panel, ingestion monitor | Not started |
| 8 | Technical SEO, schema, sitemap | Basic meta tags only |
| 9 | Affiliate, ads, subscriptions | Not started |
| 10 | Electronics and other retail categories | Not started |
| 11 | Security, monitoring, tests, production launch | Not started |

## Blockers
- No live source license/authorization or connected retailer API.
- No provisioned database/authentication project.
- No production hosting or domain selected.
- No Bolt account operation is available via the current connector.
- Node package installation/build verification not yet completed.

## Data principles
Product records are distinct from retailer offers. Offers require source, store, timestamp, validity, promotion terms, currency and unit normalization. Do not display stale offers as current. Do not infer product matches from names alone.
