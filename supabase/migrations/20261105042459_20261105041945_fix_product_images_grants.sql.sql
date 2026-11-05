/*
# Fix product_images grants

The platform_features migration created product_images with default Postgres
grants (ALL to PUBLIC), then added explicit grants on top without first
revoking the defaults. As a result, anon and authenticated had TRUNCATE,
TRIGGER, REFERENCES, INSERT, UPDATE, DELETE on product_images — far more
than intended.

This migration:
1. Revokes ALL from anon, authenticated, and service_role on product_images.
2. Re-grants SELECT to anon, authenticated (public read of product images).
3. Re-grants SELECT, INSERT, UPDATE, DELETE to authenticated (admin writes via RLS policy).
4. Re-grants SELECT, INSERT, UPDATE, DELETE to service_role (server-side).
5. Also removes TRUNCATE/TRIGGER/REFERENCES from service_role (not needed).
*/

REVOKE ALL ON public.product_images FROM anon, authenticated, service_role;

GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO service_role;
