# PricePine implementation review — 5 November 2026

Scope: free Canadian grocery comparison and shopping-list service. This is an engineering review, not a legal opinion, penetration test or WCAG certification. No checkout, subscription billing, fulfilment, payment-card storage, marketing analytics or advertising tracker is implemented. Bolt AI was not used for these changes.

## Implemented

- Versioned public About, Contact, Privacy, Terms, Cookies/device storage, Price/affiliate disclosure and Accessibility pages; consistent footer and current copyright year. Plain-text configuration is escaped before rendering.
- Privacy notice describes actual authentication/browser storage, GitHub/retailer image requests, support data, exports, manual deletion and unconfirmed retention/transfer arrangements. No fake consent banner or automatic deletion claim.
- Device list/postal-code removal with a confirmation step, separate from account deletion/sign-out. Account export now includes support requests and notifications, explicitly scoped to the requesting account; existing list/watch export retained.
- Existing authenticated support tickets retained, with visible reference IDs and access/correction request wording. No pretend email delivery or response SLA.
- Admin-only Compliance & trust panel: editable business, SEO and legal-page drafts, configuration download, GitHub editor link, published version/date, security connection check and actionable remaining checks. **Saving a draft does not publish it.** Commit `src/trust-config.json` and publish. This deliberately requires no browser GitHub secret and no new unaudited database table.
- Standalone product pages now include discovered catalog entries, reuse the app's exact deduplication rules, preserve merged aliases as noindex canonical aliases and have page-specific initial-HTML OG/Twitter/Product metadata. No unverified Offer/Review markup. Paginated product directory adds crawlable links.
- Saved public catalog snapshot prevents losing the database product sitemap when build credentials are unavailable. It contains public product information only. Product pages update on site publication; current in-app feeds still update independently.
- Admin bundle lazy-loaded; stable image space, reduced motion, focus indicators, small-screen reflow, semantic navigation, accessible error fallback. Existing skip link and infinite-scroll fallback retained.
- Image uploads now decode and validate dimensions before storage; existing server bucket MIME/5 MB restrictions and admin storage policies retained. Client validation is not a replacement for server validation.
- Hosting `_headers` configuration adds CSP, HSTS, nosniff, referrer/permissions policies and separate cache rules. **Host support and effective response headers require live verification.** CSP allows existing Supabase, public GitHub feeds, Open Food Facts and HTTPS images; inline styles remain allowed for existing styling.

## Findings and remaining actions

| Severity/status | Finding | Required action |
|---|---|---|
| High / needs operator information | Verified legal operator, public support/privacy email, operating location and official social profiles are not supplied | Fill verified details in Compliance & trust, commit and publish. Account support is available but cannot serve someone who cannot regain account access. |
| High / requires provider verification | This Bolt database is not among projects accessible through the connected Supabase tool | Verify live RLS, account-to-account isolation, email confirmation, reset allowlist, brute-force limits, password policy, privileged MFA and storage policy in the actual provider. Source policies alone do not establish live settings. |
| High / requires provider work | Support submission has authentication, ownership and length checks but no verified server-side per-account throttle | Add transactional rate limiting in the database/provider. Client cooldown alone is not security. |
| High / requires legal/operator review | Retention schedule, privacy jurisdiction, controller/processor identity, cross-border transfers, source scraping/image reuse permissions unresolved | Approve documented retention/deletion procedure and relevant provider/source agreements; public content availability does not grant reuse permission. |
| Medium | Account deletion is an administrator-reviewed request | Verify requester; use privileged provider deletion; confirm cascades, storage, logs/backups and legal holds. Ticket status alone does not delete data. |
| Medium | Browser-held bearer sessions are used, not HttpOnly cookies | Preserve SDK architecture; mitigate XSS with escaping and CSP. HttpOnly migration would require a server/session architecture and cannot be claimed as a frontend setting. |
| Medium | Hash comparison routes cannot have distinct social crawler previews | Share standalone `/products/…html` links. Existing fragment links continue working. Static pages require republishing to include subsequently discovered products. |
| Medium | Admin policy editor produces repository drafts, not database CMS writes | Commit downloaded configuration and publish. A fully persistent CMS needs an appropriately protected schema/API and provider access. |
| Medium / requires live verification | CSP/header support, real HTTP 404, HTTPS redirects, responsive/keyboard/screen-reader flows and real-user Core Web Vitals | Verify on the deployed host; no CWV or WCAG conformance claim from build/unit tests. |
| Low | Inline styles are allowed by CSP and HTTPS image sources are broad for existing retailer fallbacks | Narrow only after inventory/testing; do not break product images or admin preview. |
| Passed (source review) | Existing migrations use private admin helpers, owner RLS, restricted function grants, admin-only uploads and audit events | Preserve; live policy checks remain separate. |
| Not applicable | Shipping/refund/checkout/payment/PCI implementation | PricePine is not the seller and accepts no payments. Retailer policies apply to purchases. |
| Requires manual verification | End-to-end registration, password reset, MFA, authorized support submission and two-account isolation | Use controlled test accounts in the actual provider; no account credentials or production customer data were changed. |

## Verification

- TypeScript and Vite production build passed.
- 39 Node tests passed, including existing price eligibility, CSV, matching, routes, image cache, and new HTML escaping, JSON-LD injection, canonical/alias, sitemap completeness and policy metadata checks.
- Generated 1,600 canonical product pages from the then-current feed and 600 saved database products, using exact application deduplication. Counts may increase as the daily job adds products.
- `npm audit --json`: 0 known vulnerabilities (0 critical/high/moderate/low) for the lockfile at review time. This does not establish absence of security defects.
- Public policy and product pages are tested as generated files. Publication and live verification are reported separately in the task response; this document does not claim a deployment succeeded before it is observed.

## Operational procedures

For a privacy request: confirm ownership through the signed-in channel; classify access/correction/deletion; collect only the necessary context; export only that user's records; record the administrator action without copying request contents to public logs; verify completion before resolving. Provider security logs/backups are not part of the frontend export. Do not promise deletion from backups without checking provider retention.

Before adding tracking: inventory vendor/purpose/data, assess consent requirements, block optional collection before consent where required, provide reject/customize/withdraw controls, and retain an appropriate consent record. Current release has no optional tracking to enable.

For legal/configuration changes: edit the draft, review dates and wording, download `trust-config.json`, replace the repository file, run `npm test` and `npm run build`, then publish. No personal support records or credentials belong in the public repository.

## Primary references consulted

- [OPC meaningful consent guidance](https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/appropriate-handling-of-personal-information/collecting-personal-information-and-consent/consent/gl_omc_201805)
- [OWASP Content Security Policy guidance](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
