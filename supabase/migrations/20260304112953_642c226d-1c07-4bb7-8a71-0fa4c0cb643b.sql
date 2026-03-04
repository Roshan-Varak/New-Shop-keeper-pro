-- Fix profiles table: allow insert and full access for authenticated users
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Authenticated full access profiles" ON public.profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Update assign_role_on_signup to always assign admin
CREATE OR REPLACE FUNCTION public.assign_role_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  RETURN NEW;
END;
$$;