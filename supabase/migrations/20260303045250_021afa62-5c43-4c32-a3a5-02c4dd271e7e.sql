
-- Remove admin-only RLS policies and replace with authenticated-user policies

-- products
DROP POLICY IF EXISTS "Admin full access products" ON public.products;
CREATE POLICY "Authenticated full access products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sales
DROP POLICY IF EXISTS "Admin full access sales" ON public.sales;
CREATE POLICY "Authenticated full access sales" ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sale_items
DROP POLICY IF EXISTS "Admin full access sale_items" ON public.sale_items;
CREATE POLICY "Authenticated full access sale_items" ON public.sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- customers
DROP POLICY IF EXISTS "Admin full access customers" ON public.customers;
CREATE POLICY "Authenticated full access customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- credit_transactions
DROP POLICY IF EXISTS "Admin full access credit_transactions" ON public.credit_transactions;
CREATE POLICY "Authenticated full access credit_transactions" ON public.credit_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- categories
DROP POLICY IF EXISTS "Admin full access categories" ON public.categories;
CREATE POLICY "Authenticated full access categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- suppliers
DROP POLICY IF EXISTS "Admin full access suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can read suppliers" ON public.suppliers;
CREATE POLICY "Authenticated full access suppliers" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- purchases
DROP POLICY IF EXISTS "Admin full access purchases" ON public.purchases;
CREATE POLICY "Authenticated full access purchases" ON public.purchases FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- purchase_items
DROP POLICY IF EXISTS "Admin full access purchase_items" ON public.purchase_items;
CREATE POLICY "Authenticated full access purchase_items" ON public.purchase_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
