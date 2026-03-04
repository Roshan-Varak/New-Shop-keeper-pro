-- Replace restrictive user_roles policies with open authenticated access
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;

CREATE POLICY "Authenticated full access user_roles" ON public.user_roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);