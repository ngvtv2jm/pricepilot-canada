# Operations

## Setup
1. Install locked dependencies with `npm ci`.
2. Use Bolt's existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never place a service-role key in VITE variables.
3. Apply the platform_features migration to this project's Bolt database only.
4. Register the owner through the app. A database administrator must explicitly insert that verified auth user ID into `private.admin_users`. No user can self-assign admin. `/\#admin` requires database authorization for writes, even when opened directly.
5. `npm test` and `npm run build` must pass. `VITE_SITE_URL` may be an HTTPS origin when the final host is chosen.

## Verification before launch
- Separate users cannot read/update one another's lists or watches.
- Anonymous catalog requests return successful empty arrays before data exists.
- Anonymous and ordinary authenticated users cannot write catalog/source/import data.
- The registered owner can create a product and variant, upload/reorder/remove images, and see those changes in catalog views.
- Verify auth confirmation/reset redirect destinations on the published origin.
- Privacy contact and account deletion handling must be configured.
- Configure retailer sources LAST. Do not change authorization flags without a documented permitted source.
- Product snapshots are generated at publish time; verify their metadata and sitemap after catalog changes.

## Rollback
Use Bolt version history or revert the application commit. Database migration adds columns/tables/policies; do not drop user records as a rollback. Review policy reversals separately.

## November 5 account/operations extension
Apply `20261105044243_account_operations.sql` (plus any recorded correction migration).
It adds private account notifications, a support/privacy request queue, restricted audit records, labelled commercial links, atomic list duplication and service-role-only normalized offer ingestion. It assigns no administrators and activates no sources.

Owner must be granted membership in private.admin_users only after confirming the exact existing auth account. No email-based client-side admin bypass exists.

Account deletion requests: verify with the signed-in owner, revoke sessions and remove the account through the authentication administrator interface, then record resolution through the support process. Merely marking the request resolved is not deletion.

Product snapshots use the public database client at build time; no service-role key is needed for SEO. Set VITE_SITE_URL if moving off the published Bolt hostname. Republish to update static product snapshots or application code. The public catalog feeds refresh without a Bolt deployment. Do not place service credentials in any VITE variable.

Import operator tool: `node scripts/import-offers.mjs batch.json` validates without a network call. `--apply` requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in a server-side environment. Batch JSON has source_id and offers (external_id, store_id, regular_price/sale_price, currency=CAD, observed_at, optional valid_until/member_only). Products must already be matched. SQL enforces authorized redistribution, active retailer/store association, freshness, valid prices, transactional writes and idempotent history/notifications. Source adapters/scheduling are deliberately not configured.

Run `npm test` and `npm run build` before deployment. CI repeats both for pushes/PRs. Email/push delivery, billing and external uptime monitoring remain inactive until their providers are configured.

The Toronto branch pilot is separate from the public price feeds. See [Nearby branches](NEARBY_BRANCHES.md) for data attribution, monthly review and verified offer prerequisites.

For the desktop and narrow-screen catalog regression, install Playwright Chromium with
`npx playwright install chromium`, build and start a local preview with `npm run preview`,
then run `npm run test:browser`. The test uses deployed-file fallbacks and a guest list
in a clean browser context. It tests denied location without requesting a real location.
The signed-in database flows require a separate test account on the project's Bolt database.
