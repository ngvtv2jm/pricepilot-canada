# PricePine AdSense readiness

PricePine does not serve Google ads by default. Do not enable ads or add a publisher ID copied from another site. The current public privacy and cookie pages describe the no-advertising release. An exact publisher ID obtained from an authorized AdSense account is public configuration, not an API key.

## Before requesting a review

- Keep product, category, brand and policy pages usable without relying on ads. Check that a clean product URL offers real same-package comparison value (price, retailer, timestamp and unit price where comparable), and that thin and duplicate entries are not used as ad placements. Attribution alone does not establish permission to reuse retailer copy or images.
- Confirm the operator, support inbox and active affiliate relationships. Keep accurate commercial disclosures next to any actual affiliate links.
- Use the existing AdSense account's **Sites** page to check whether the apex domain is already listed and whether it needs verification or review. Do not submit a duplicate domain or assume its dashboard status from public checks.
- Use the verification token or seller record supplied by that account. Do not replace PricePine's placeholder `ads.txt` until the owner authorizes the exact account and seller row. An HTML verification meta tag is a non-ad-serving option when the dashboard offers it. Do not add an ad script simply to test readiness.

## Before serving ads

- Review applicable consent/privacy requirements against actual visitor regions and deployment behavior; a Canada-oriented site can have international visitors. Configure the account's appropriate consent flow and disclose Google/third-party advertising data use before any ad requests. Do not change existing analytics or other storage defaults as part of AdSense verification.
- Google requires a certified IAB TCF CMP for personalized ads served to users in the EEA, UK or Switzerland. Check Google’s current guidance for the selected ad format and consent policy.
- Update the live privacy, cookie and disclosure content to match the implementation. Verify ad requests remain off when consent is required and denied, and test acceptance, withdrawal and page navigation. Keep ads off account, support, login, empty and other low-value screens.
- Confirm AdSense **Ready**, ads.txt recognition and any Policy Center issues in the dashboard. Then verify placement and consent on the actual deployment. Approval is not guaranteed.

## Deployment safety check (does not contact Google)

Run `python3 scripts/check-ads-off.py dist` against the exact PricePine deployment before an ads-off publish. The script flags Google ad activation markers in deployable HTML/JavaScript and any Google seller row in ads.txt; it does not inspect dashboard approval, verify remote scripts at runtime, or prohibit an ownership-only meta tag.

## Google references

- [Site readiness](https://support.google.com/adsense/answer/7299563)
- [Common reasons for disapproval, including thin and affiliate pages](https://support.google.com/adsense/answer/81904)
- [Domain verification and Ready status](https://support.google.com/adsense/answer/12131223)
- [Google CMP requirements](https://support.google.com/adsense/answer/13554116)
