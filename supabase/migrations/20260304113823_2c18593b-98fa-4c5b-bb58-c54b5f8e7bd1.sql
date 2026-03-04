
-- Drop all existing restrictive policies and recreate as permissive
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['products','categories','suppliers','purchases','purchase_items','sales','sale_items','customers','credit_transactions','profiles','user_roles'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated full access %s" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users full access" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "Allow authenticated full access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END;
$$;
