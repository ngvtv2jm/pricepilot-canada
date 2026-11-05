# PricePilot Canada

Canadian shopping comparison platform built with React, TypeScript, Vite and Bolt Database.

Implemented: account screens, device and account shopping lists, exact-variant price comparison, basket optimization, price watches, restricted catalog administration, product images, and static information pages.

Retailer sources are deliberately unconfigured. See docs/ROADMAP.md for remaining work and docs/OPERATIONS.md for setup and verification. This is a development release, not a completed production launch.

## Development
```
npm ci
npm test
npm run dev
npm run build
```

## Configuration
Use VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from the dedicated Bolt database. Never expose service-role credentials in frontend variables. Apply the platform_features migration. Owner admin access requires an explicit database assignment after registration.

No Bolt AI tokens for app code, testing or deployment. Bolt tokens are permitted only for database configuration. No fabricated retailer offers or unauthorized sources.
