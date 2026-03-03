
-- Make sales.customer_id SET NULL on delete so deleting a customer doesn't break sales
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_customer_id_fkey;
ALTER TABLE public.sales ADD CONSTRAINT sales_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

-- Make credit_transactions.customer_id CASCADE on delete
ALTER TABLE public.credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_customer_id_fkey;
ALTER TABLE public.credit_transactions ADD CONSTRAINT credit_transactions_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
