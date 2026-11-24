# Homepage and clean-URL release

- Product-led home with live category counts, real product pictures, featured exact-package observations, retailer shortcuts, search suggestions, shopping-list and Toronto branch-finder actions, and expandable help.
- Featured picks prioritise recent observations and retailer coverage, not invented sales or popularity figures. Multi-variant prices never combine retailers from different packages.
- Most-viewed and recently-viewed products are based on local browser history only. Up to 100 product IDs/counts/times are stored on the device, never sent to a view-tracking endpoint. Storage controls remove this history; the notices disclose it.
- Legacy `.html` policy and product documents remain complete and accessible. Canonicals use clean paths. The self-hosted `clean-urls.js` rewrites the address using history.replaceState, preserving queries and hashes without navigation loops on Bolt's native pretty-URL hosting. Host-level 301 rules are included where supported.
- The generated `bolt-release` branch contains lightweight website source. Main retains product images, catalog feeds and generated artifacts. A GitHub workflow prepares this branch on source changes. Bolt should follow `bolt-release`; edit source on main. The existing database and account configuration are not moved.
- Runtime/build hydration downloads public catalog JSON from main. Product images continue to load from GitHub and are excluded from the deployment ZIP.
- CI includes desktop/mobile Chromium checks, collection/category actions, browsing-history persistence, every policy URL and a product-page refresh. Screenshot artifacts are retained for seven days.

Do not call a release live until pricepine.ca shows the new homepage and clean addresses have been tested on the production host. Earlier live checks still showed the older Bolt-domain canonical and older JS bundle despite a reported publish.
