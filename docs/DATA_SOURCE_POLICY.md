# Retailer data acquisition and publishing policy

PricePilot must not claim any retailer integration until there is a documented permitted source and successful import. Publicly accessible pages do not automatically confer permission to bulk copy, reproduce product images, or redistribute catalog pricing.

Each provider must be assessed for permitted collection, commercial reuse, attribution, image rights, rate limits, store coverage, and revocation. A data source is enabled only when authorization_status=authorized and allowed_redistribution=true. Do not bypass technical restrictions.

Never infer real-time availability from historical observations. Prices must display observation time, applicable store, conditions and limitations. Promotions and member-only prices must be labelled. Missing basket items must not be counted as zero.

## Next operational steps
1. Select the Supabase organization and provision a dedicated Canadian-region project after reviewing quoted cost.
2. Apply the versioned SQL migration, test RLS, configure client URL and publishable key.
3. Obtain at least one authorized Canadian grocery feed or merchant-supplied data source.
4. Implement secure ingestion worker and test with licensed records.
5. Integrate authenticated shopping lists, offer search, matching review, and monitoring.
6. Run build and end-to-end tests before production deployment.
