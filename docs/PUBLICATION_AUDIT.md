# PricePine publication audit — 24 November 2026

Scope: the public comparison application, static policy and product pages, deployable output, product image hosting, indexing and release checks. Changes were made directly; no Bolt AI prompts were used.

## Findings corrected

- The live domain still returned the old Bolt-host canonical, robots and sitemap URLs during the audit. The release uses `https://pricepine.ca` throughout indexing signals.
- Policy, product and directory navigation exposed `.html` filenames. The release publishes real directory indexes with clean canonical URLs such as `/cookies/` and `/products/PRODUCT_ID/`. Legacy `.html` links have host redirect rules and HTML redirect fallbacks. Production HTTP redirect status still needs verification on Bolt.
- Product cache files made the deployment exceed Bolt's 100 MB limit. Source images remain untouched on GitHub; only copies in build output are removed. Old imported image paths, new cache paths and product sharing images resolve to GitHub.
- Daily image caching previously focused on discovered products. It now includes database snapshot products and gallery images and retains known-good files after source failures.
- Static information pages now share a branded navigation header. The application footer includes the legal operator and support contact.
- CI now audits the complete deployable output after each production build, including clean URLs, sitemap targets, image files, internal links and the ZIP limit.

## Validation

- 55 application regression tests passed; 9 Python maintenance checks passed.
- Production TypeScript/Vite build passed.
- Deployment audit: 5,361 indexed canonical pages/sitemap URLs; 109,349 internal link checks; 5,895 GitHub image references; 5,958 legacy redirect documents; zero audit errors.
- Actual deployment ZIP: 19,201,006 bytes (about 19.2 MB), below 100 MB. Generated product pages remain in the release.
- All 600 mapped legacy image files and all files referenced by 5,297 cache entries are tracked in GitHub. New images continue to be committed by daily maintenance.
- Three outbound sample-image checks returned HTTP 429 in this execution environment. Live external image delivery was therefore not verified by those requests; source files and image references were checked locally. The retailer fallback remains available in the app.
- Production dependency audit: zero known vulnerabilities at audit time.

## Publication gates and limits

- Final release must be deployed and checked at pricepine.ca before these changes are described as live. Check `/cookies/`, an old `.html` link, an existing product, the sitemap and its canonical domain.
- A fresh automated Chromium session could not launch in this execution environment (`socket() failed: Operation not permitted`). No new mobile-browser or screen-reader conformance pass is claimed. Existing browser tests were updated for GitHub-hosted images; visual browser verification is separate from the static audit.
- No signed-in account, password-recovery email, admin mutation, or provider-level access-control test was performed in this audit. These require the production provider configuration and authorized account sessions. Passing public-page tests does not certify those flows.
- AdSense publisher ID has not been supplied. No advertisements or optional ad tracking are activated. Ownership verification and ads.txt generation accept a real ID when provided; Google approval is not guaranteed.
- The operator still needs to confirm provider retention/backup periods and image/content usage rights. Policies disclose current limitations rather than claiming they have been verified.
- Prices are dated retailer website observations; stock and branch-specific prices must not be presented as verified without appropriate evidence.
