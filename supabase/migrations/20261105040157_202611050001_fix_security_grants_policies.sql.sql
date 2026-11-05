/*
# Fix Security: Grants, Policies, and Extension Schema

Fixes critical security issues in the initial schema:
1. Revokes overbroad default grants (anon/auth had full CRUD on all catalog tables).
2. Grants SELECT-only to anon/authenticated on catalog tables; writes to service_role only.
3. Adds no client policies on data_sources/import_jobs/price_history (server-only).
4. Moves pg_trgm to extensions schema.
5. Replaces FOR ALL policies with 4 per-verb policies on user tables.
6. Fixes (select auth.uid()) to auth.uid(); adds DEFAULT auth.uid() on user_id columns.
*/

-- 1. Move pg_trgm extension to extensions schema
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;
DROP INDEX IF EXISTS public.products_name_trgm;
CREATE INDEX products_name_trgm ON public.products USING gin(name extensions.gin_trgm_ops);

-- 2. Revoke ALL grants from anon and authenticated on every table
REVOKE ALL ON public.retailers FROM anon, authenticated;
REVOKE ALL ON public.retailer_stores FROM anon, authenticated;
REVOKE ALL ON public.data_sources FROM anon, authenticated;
REVOKE ALL ON public.categories FROM anon, authenticated;
REVOKE ALL ON public.brands FROM anon, authenticated;
REVOKE ALL ON public.products FROM anon, authenticated;
REVOKE ALL ON public.product_variants FROM anon, authenticated;
REVOKE ALL ON public.product_identifiers FROM anon, authenticated;
REVOKE ALL ON public.retailer_products FROM anon, authenticated;
REVOKE ALL ON public.store_offers FROM anon, authenticated;
REVOKE ALL ON public.import_jobs FROM anon, authenticated;
REVOKE ALL ON public.price_history FROM anon, authenticated;
REVOKE ALL ON public.shopping_lists FROM anon, authenticated;
REVOKE ALL ON public.shopping_list_items FROM anon, authenticated;
REVOKE ALL ON public.price_alerts FROM anon, authenticated;

-- 3. Revoke from service_role to re-grant cleanly
REVOKE ALL ON public.retailers FROM service_role;
REVOKE ALL ON public.retailer_stores FROM service_role;
REVOKE ALL ON public.data_sources FROM service_role;
REVOKE ALL ON public.categories FROM service_role;
REVOKE ALL ON public.brands FROM service_role;
REVOKE ALL ON public.products FROM service_role;
REVOKE ALL ON public.product_variants FROM service_role;
REVOKE ALL ON public.product_identifiers FROM service_role;
REVOKE ALL ON public.retailer_products FROM service_role;
REVOKE ALL ON public.store_offers FROM service_role;
REVOKE ALL ON public.import_jobs FROM service_role;
REVOKE ALL ON public.price_history FROM service_role;
REVOKE ALL ON public.shopping_lists FROM service_role;
REVOKE ALL ON public.shopping_list_items FROM service_role;
REVOKE ALL ON public.price_alerts FROM service_role;

-- 4. Grant SELECT to anon+authenticated on catalog tables (anonymous reads)
GRANT SELECT ON public.retailers TO anon, authenticated;
GRANT SELECT ON public.retailer_stores TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT SELECT ON public.product_identifiers TO anon, authenticated;
GRANT SELECT ON public.retailer_products TO anon, authenticated;
GRANT SELECT ON public.store_offers TO anon, authenticated;

-- 5. Server-only tables: NO client grants; service_role CRUD only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_sources TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_history TO service_role;

-- 6. Catalog tables: service_role full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retailers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retailer_stores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_identifiers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retailer_products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_offers TO service_role;

-- 7. User tables: CRUD to authenticated only (requires sign-in)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_list_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_list_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_alerts TO service_role;

-- 8. Drop old FOR ALL policies on user tables
DROP POLICY IF EXISTS own_lists ON public.shopping_lists;
DROP POLICY IF EXISTS own_items ON public.shopping_list_items;
DROP POLICY IF EXISTS own_alerts ON public.price_alerts;

-- 9. shopping_lists: 4 per-verb policies
DROP POLICY IF EXISTS "select_own_lists" ON public.shopping_lists;
CREATE POLICY "select_own_lists" ON public.shopping_lists FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_lists" ON public.shopping_lists;
CREATE POLICY "insert_own_lists" ON public.shopping_lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_lists" ON public.shopping_lists;
CREATE POLICY "update_own_lists" ON public.shopping_lists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_lists" ON public.shopping_lists;
CREATE POLICY "delete_own_lists" ON public.shopping_lists FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 10. shopping_list_items: 4 per-verb policies (ownership via parent list)
DROP POLICY IF EXISTS "select_own_items" ON public.shopping_list_items;
CREATE POLICY "select_own_items" ON public.shopping_list_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shopping_lists l WHERE l.id = shopping_list_items.list_id AND l.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_items" ON public.shopping_list_items;
CREATE POLICY "insert_own_items" ON public.shopping_list_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.shopping_lists l WHERE l.id = shopping_list_items.list_id AND l.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_items" ON public.shopping_list_items;
CREATE POLICY "update_own_items" ON public.shopping_list_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shopping_lists l WHERE l.id = shopping_list_items.list_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shopping_lists l WHERE l.id = shopping_list_items.list_id AND l.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_items" ON public.shopping_list_items;
CREATE POLICY "delete_own_items" ON public.shopping_list_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shopping_lists l WHERE l.id = shopping_list_items.list_id AND l.user_id = auth.uid()));

-- 11. price_alerts: 4 per-verb policies
DROP POLICY IF EXISTS "select_own_alerts" ON public.price_alerts;
CREATE POLICY "select_own_alerts" ON public.price_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_alerts" ON public.price_alerts;
CREATE POLICY "insert_own_alerts" ON public.price_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_alerts" ON public.price_alerts;
CREATE POLICY "update_own_alerts" ON public.price_alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_alerts" ON public.price_alerts;
CREATE POLICY "delete_own_alerts" ON public.price_alerts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 12. Set DEFAULT auth.uid() on user_id columns so client inserts work without passing user_id
ALTER TABLE public.shopping_lists ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.price_alerts ALTER COLUMN user_id SET DEFAULT auth.uid();
