-- Add company column to products
ALTER TABLE public.products ADD COLUMN company TEXT;

-- If you want to set a default for existing data, you can run:
-- UPDATE public.products SET company = 'Unknown' WHERE company IS NULL;
