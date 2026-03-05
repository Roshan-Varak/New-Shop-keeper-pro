
-- Create shop_settings table for storing shop password
CREATE TABLE IF NOT EXISTS public.shop_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- Allow anon to read shop_settings (for password verification)
CREATE POLICY "Allow anon read shop_settings" ON public.shop_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update shop_settings" ON public.shop_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access shop_settings" ON public.shop_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default shop password (default: "shop123")
INSERT INTO public.shop_settings (key, value) VALUES ('shop_password', 'shop123')
ON CONFLICT (key) DO NOTHING;

-- Update all existing table policies to also allow anon access
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['products','categories','suppliers','purchases','purchase_items','sales','sale_items','customers','credit_transactions','profiles','user_roles'])
  LOOP
    EXECUTE format('CREATE POLICY "Allow anon full access" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END;
$$;
