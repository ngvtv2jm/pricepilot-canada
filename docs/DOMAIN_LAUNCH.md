# PricePine domain launch — 24 November 2026

Primary origin: https://pricepine.ca. Operator: Altergy Network Solutions Corp. Support and privacy: info@ansolcorp.ca (provided by operator).

## Implemented

- One canonical origin for initial homepage metadata, WebSite structured data, generated product/policy/directory pages, sitemap and robots.txt.
- Old imported image URL aliases retained, with new-domain aliases added, so existing database images continue resolving to local files.
- Public support/privacy and operator details on the policy pages. No unverified address or registration number added.
- Optional GOOGLE_SITE_VERIFICATION token and ADSENSE_PUBLISHER_ID build configuration; strict validation, no executable HTML accepted. AdSense verification metadata and ads.txt are generated only from a valid real publisher ID. Ads are not activated by verification.
- Admin publication checklist for Search Console, redirects, authentication callbacks and AdSense.
- Generated pages are rebuilt during npm build and npm test. Site data is a dated snapshot; daily public data feeds remain independent.

## Account/hosting steps still needed

1. In hosting settings, confirm pricepine.ca is the primary domain and old Bolt/www URLs permanently redirect, preserving paths. A canonical tag is not a redirect. Do not use a hash-dropping redirect.
2. In the database authentication provider, add https://pricepine.ca/#account to confirmation/reset return URLs and set https://pricepine.ca as the site URL. Verify a real confirmation/recovery email. Browser sessions and guest lists on the old domain do not automatically move to the new origin.
3. Add pricepine.ca to Search Console and verify using DNS or the Google token; submit https://pricepine.ca/sitemap.xml. Inspect the homepage and a product URL. Indexing is Google's decision.
4. Add pricepine.ca to AdSense (operator will do this). Supply its real publisher ID or exact verification token for deployment. Do not use a sample publisher ID. Wait for Google's review.
5. Before enabling ad scripts: confirm source/image reuse rights, review original comparison value and content quality, update privacy disclosures for Google's data/cookie use with the required links, and configure applicable consent including a certified CMP for EEA/UK/Switzerland visitors. Never place ads in private account/admin/support flows or disguised as comparison controls.

Google references:
- https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- https://support.google.com/adsense/answer/7299563
- https://support.google.com/adsense/answer/7584263
- https://support.google.com/adsense/answer/1348695
- https://support.google.com/adsense/answer/13554020

Neither an available custom domain nor a successful build guarantees indexing or AdSense acceptance. The site still uses retailer-derived product data; original comparisons and tools add functionality, but Google assesses overall value and rights.

## Redirect verification after publishing

The release emits exact permanent redirects for existing legacy HTML documents
and keeps the canonical HTML content in place. Unmatched URLs are left to the
native 404 handler, not sent to the homepage. A known-host browser fallback
keeps old bookmarks, path/query and public product fragments working when
the platform does not enforce a redirect. It does not copy account credentials,
browser sessions, or guest data between origins, and does not itself return
HTTP 301. The rule syntax uses the static hosting provider's documented force
marker; verify Bolt's parser before claiming it was applied. If live behavior
still disagrees, use a verified provider redirect mechanism instead of adding a
wildcard that could break all clean paths.

Release smoke test (ordinary GET, not just HEAD): the home and clean product,
brand, category, catalog and policy routes should return 200 directly; old
`.html` routes should return a one-hop 301; nonsense root and product paths
should return real 404; the old product-hash bookmark must be exercised in
a browser; auth callbacks on their original origin must continue to work.
