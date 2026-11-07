# Nearby branch pilot

The Stores page covers a sample of grocery branches in the City of Toronto. It uses
a public directory for location lookup and keeps the existing account database
catalog separate. Branch addresses help shoppers find a store. They establish
neither product availability nor a local price.

| Source | Coverage in the pilot | Refresh and limitations |
| --- | --- | --- |
| [Toronto Public Health DineSafe](https://open.toronto.ca/dataset/dinesafe/) | Toronto locations for No Frills, Loblaws, Real Canadian Superstore and Giant Tiger with a recent inspection, usable address and coordinates | The city publishes daily. Review and regenerate the pilot monthly. The page flags snapshots older than 45 days. Inspection records are not an opening-hours or inventory feed. |
| [Statistics Canada 2021 Census Forward Sortation Area Boundary File](https://www150.statcan.gc.ca/n1/en/catalogue/92-179-X) | Cartographic centroids for the pilot postal areas | Review when a new census geography is released. Postal prefixes are approximate and may differ from current Canada Post delivery boundaries. |
| Official retailer locators | Links shoppers can open to confirm branch details | Locators are linked for verification. The pilot does not collect or redistribute store hours, retailer inventory or branch prices from them. |

Branch data is adapted under the [Open Government Licence – Toronto](https://open.toronto.ca/open-data-licence/).
Census geography is adapted under the [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada).
The source agencies do not endorse this product. The directory contains public business locations only.

To refresh the directory, download the current CSV from the DineSafe catalog, then query the
[2021 cartographic boundary layer](https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer/14)
using `CFSAUID LIKE 'M%'`, `outFields=CFSAUID`, `returnGeometry=true`, `outSR=4326`,
`geometryPrecision=5`, `maxAllowableOffset=0.00025` and `f=geojson`.
Run `python3 scripts/build-toronto-branches.py dinesafe.csv toronto-fsa.geojson --checked YYYY-MM-DD`.
Review changes in `public/toronto-branches.json`, including branch moves or closures,
ambiguous entries and locator URLs, before deploying. Raw downloads stay outside the repository.
The stable ID is the city's establishment identifier with a source prefix. It is
intentionally separate from database branch IDs.

The browser uses the first three characters of a Canadian postal code and saves
only that prefix. It can also use device coordinates on explicit request. The
page computes straight-line distances locally without a geocoding service.
Device coordinates are held only for the current visit. Postal areas outside
the pilot and device locations outside its search envelope show a coverage notice.

## Branch product and price coverage

| Source | Exact product | Branch price | Stock and fulfillment |
| --- | --- | --- | --- |
| Public GitHub discovery, refresh and comparison feeds | Verified retailer SKU and exact package when available | Website scope only | Unknown |
| Toronto directory | No product feed | Unavailable | Unknown |
| Existing database branch offer model | Can reference an exact variant | Can show eligible branch observations already in the database | No confirmed availability from the model alone. No new provider was connected. |

Before enabling branch collection, establish a retailer or licensed provider with
permitted redistribution and a response that identifies the exact branch, SKU or
verified GTIN, variant, CAD price, offer conditions, fulfillment and observation
time. Record expiry and evidence of stock only when supplied. Add a branch and
fulfillment key to the ingestion and history model before supporting multiple
fulfillment modes. Never use the public website prices to populate branch offers.
