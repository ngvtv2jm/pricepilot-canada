# PricePilot Canada delivery status

Retailer source configuration is intentionally LAST. Updated November 5, 2026.

| Phase | Implemented | Remaining gate |
|---|---|---|
| 0 Inventory | Repository/schema review and documented launch gaps | Ongoing review |
| 1 App/accounts | Signup/signin/reset, account-data export, privacy/support requests | Owner role confirmation; live reset-email verification |
| 2 Database/import | RLS, grants, atomic service-only normalized batch importer, validation, import CLI dry run | Retailer adapters, source matching and scheduler configuration LAST |
| 3 Catalog | Product/category/brand/store/variant forms, barcodes, multi-image upload/reorder, specification attributes | Owner admin browser CRUD test |
| 4 Comparison | Store-specific exact variants, unit pricing, observed history, specification comparison board | Real-source verification LAST |
| 5 Basket | Device/account lists, quantity/checked controls, export, rename, atomic duplication, guest import and optimization | Signed-in browser list isolation/regression checks |
| 6 Alerts | Target watches, target editing, pause/resume, private persisted notification inbox, eligible-offer trigger | Email/push provider setup and delivery testing |
| 7 Admin | Catalog editor, import monitor, support/privacy request queue, audit trail and on-demand database health check | External uptime monitoring; owner admin smoke tests |
| 8 SEO | Published host canonical, crawlable static product snapshots, per-product OG/Twitter/schema, sitemap and robots | Product snapshots generated on publish; verify with real catalog |
| 9 Monetization | Free-plan page; admin-managed standard/affiliate/sponsored links with disclosure, no influence on rankings | Actual partner URLs/contracts; paid billing intentionally inactive |
| 10 Categories | Variant specifications editor and three-product comparison board | Populate accurate category-specific product data |
| 11 QA/release | Production build and ten automated tests; GitHub CI workflow | Database migration has a recorded 24-check report; public published routes checked; full launch depends on remaining gates above |

## Limits and external configuration
- No retailer sources or offers are fabricated. Source-specific adapters and schedules remain disabled.
- Email, web push, paid billing and third-party uptime services have no credentials configured and are not active.
- Catalog reads use stable 500-row pages and fail explicitly above 50,000 records; they do not silently truncate at 1,000. Server-side search/filtering is still needed before loading large national feeds.
- Product information pages are build-time snapshots. Republish after catalog changes; current prices remain in the app and are not embedded as stale schema offers.
- Account deletion is an administrator-reviewed request workflow, not immediate self-service deletion. Status changes alone do not delete data.
- No distance claims or savings guarantees. Comparisons exclude taxes, deposits, fees and travel costs.
- Passing local tests does not establish that every production feature is complete. Unverified gates remain explicit.

## Latest verification
- Reconnected Bolt without sending any AI prompt. Manual table inspection confirmed the account-operations tables and zero source/test records.
- The earlier migration task completed before the no-token correction; its saved report records 24 checks passed. No new database AI actions were used.
- Password-recovery callbacks now route to the account screen and current-offer eligibility refreshes every 30 seconds. Build and ten tests pass.
- Owner account is registered and confirmed, but the private admin role still requires manual SQL access. `docs/owner-admin.sql` is prepared, not executed.
- Bolt UI has no manual SQL editor, and project terminal has no database connection environment variables. Claim/connect the existing database through Supabase to run manual SQL; do not replace it with a blank database.
