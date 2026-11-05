# Source configuration

Admin > Sources supports draft configuration, activation and pausing. All sources start paused. Activation requires an active retailer, authorized status, redistribution permission, a licence/provenance reference and an unexpired licence. Pausing removes the source's prices from public database reads and blocks new imports. Configuration changes require pausing first. Changes are audited. Only existing administrators may edit sources.

1. Create the retailer and stores in Admin; set the retailer active.
2. Create a source for that retailer and record permission/provenance. Do not save API keys here.
3. Save, then Activate when verified.
4. Create product/variant records and use Match review to map each source external ID to a variant, source and retailer.
5. Run scripts/import-offers.mjs with normalized JSON as documented in OPERATIONS.md. Dry-run first. Keep service credentials on the operator/server only.

Activation is not an API connector or a scheduled fetch. No external source is enabled automatically. Existing ingestion accepts only fresh CAD observations within 48 hours, active matching stores and mapped variants.

Free options: Open Food Facts for product metadata (ODbL and separate image licence), Open Prices for available crowdsourced observations (ODbL; Canadian coverage/freshness must be checked), and your own verified observations. Attribution/share-alike requirements must be addressed before using open datasets. No complete free FreshCo feed has been verified.

Migration 20261105132019_source_controls.sql was applied manually in Bolt's table Query editor, with no Bolt AI prompts. Transactional checks cover rejected unapproved activation, approved activation, pause and rejection of non-admin inserts; test data is rolled back.

## Admin API & imports

Open Food Facts is the first working external catalog adapter. Open Admin > API & imports, review the source licence, enable manual imports and save. Enter 1–10 barcode numbers, fetch a preview, select products and import them. No API key is needed. Canada-only is on by default; language and optional image imports are configurable. Requests are spaced 4.5 seconds apart and stop on rate limiting. Missing products and unknown package sizes are reported without invented data.

The database importer enforces administrator access and enabled settings, validates records and imports the batch atomically. Duplicate barcodes are skipped, preserving existing edits. Data provenance is stored and shown on product pages; barcode verification remains false until reviewed. Imports create products, brands, variants and identifiers, not retailer offers. API providers requiring secrets are not connected; they require a separately deployed server adapter. The endpoint is fixed to the supported Open Food Facts API instead of accepting arbitrary URLs or client-side secrets.

## CSV workflow

Admin > CSV import & export provides a blank template, validated file preview, atomic insert-only import and full catalog export. Fields include image_url, source_url, source_provider and source_license. Upload limit: 500 rows or 5 MB. CSV supports quoted commas, escaped quotes, multiline descriptions, UTF-8 BOM and CRLF. Spreadsheet formula prefixes are escaped on export. Preserve barcodes as text when using spreadsheet editors.

Duplicate checks use barcode, canonical source URL, exported product ID and the import ledger. Existing catalog entries are skipped, not overwritten. Unknown duplicate identities still need human review. Images remain external URLs; the importer does not download or claim image rights. No offers/prices are created.

For research batches not yet uploaded, follow docs/research/README.md and retain every delivered batch in the research register. The first 100 products have not been researched yet.
