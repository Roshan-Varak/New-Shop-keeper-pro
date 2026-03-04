ALTER TABLE public.purchases DROP CONSTRAINT purchases_supplier_id_fkey;
ALTER TABLE public.purchases ADD CONSTRAINT purchases_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;
ALTER TABLE public.purchases ALTER COLUMN supplier_id DROP NOT NULL;