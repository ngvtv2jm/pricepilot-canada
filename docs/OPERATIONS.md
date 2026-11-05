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
- Keep robots/noindex in staging. Product social previews need server-rendered routes before indexing a large catalog.

## Rollback
Use Bolt version history or revert the application commit. Database migration adds columns/tables/policies; do not drop user records as a rollback. Review policy reversals separately.
