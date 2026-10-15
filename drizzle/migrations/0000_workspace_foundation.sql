CREATE TYPE public.org_role AS ENUM ('owner','admin','member');
CREATE TYPE public.plan_tier AS ENUM ('free','pro','enterprise');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan public.plan_tier NOT NULL DEFAULT 'free',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.organizations TO authenticated;
GRANT INSERT (name, created_by), UPDATE (name) ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.org_members (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_members TO authenticated;
GRANT ALL ON public.org_members TO service_role;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.org_members WHERE org_id = _org AND user_id = _user)
$$;
CREATE OR REPLACE FUNCTION public.is_org_admin(_org uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.org_members WHERE org_id = _org AND user_id = _user AND role IN ('owner','admin'))
$$;

CREATE POLICY "members read org" ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id, auth.uid()));
CREATE POLICY "create org" ON public.organizations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "admins rename org" ON public.organizations FOR UPDATE TO authenticated USING (public.is_org_admin(id, auth.uid()));
CREATE POLICY "owner deletes org" ON public.organizations FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.org_members m WHERE m.org_id = id AND m.user_id = auth.uid() AND m.role = 'owner'));

CREATE POLICY "members see members" ON public.org_members FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "admins add members" ON public.org_members FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(org_id, auth.uid()) AND role <> 'owner');
CREATE POLICY "admins change members" ON public.org_members FOR UPDATE TO authenticated USING (public.is_org_admin(org_id, auth.uid())) WITH CHECK (role <> 'owner');
CREATE POLICY "admins remove or self leave" ON public.org_members FOR DELETE TO authenticated USING (public.is_org_admin(org_id, auth.uid()) OR user_id = auth.uid());

-- creator of an org becomes its owner automatically
CREATE OR REPLACE FUNCTION public.handle_new_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.org_members (org_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END $$;
CREATE TRIGGER on_org_created AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.handle_new_org();

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read projects" ON public.projects FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "members create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "members edit projects" ON public.projects FOR UPDATE TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "creator or admin deletes project" ON public.projects FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_org_admin(org_id, auth.uid()));

CREATE TABLE public.scan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  pixel text NOT NULL,
  scan text NOT NULL,
  voc double precision,
  jsc double precision,
  ff double precision,
  pce double precision,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scan_results_project_idx ON public.scan_results(project_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.scan_results TO authenticated;
GRANT ALL ON public.scan_results TO service_role;
ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.can_access_project(_project uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects p JOIN public.org_members m ON m.org_id = p.org_id WHERE p.id = _project AND m.user_id = _user)
$$;
CREATE POLICY "members read results" ON public.scan_results FOR SELECT TO authenticated USING (public.can_access_project(project_id, auth.uid()));
CREATE POLICY "members save results" ON public.scan_results FOR INSERT TO authenticated WITH CHECK (public.can_access_project(project_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "members delete results" ON public.scan_results FOR DELETE TO authenticated USING (public.can_access_project(project_id, auth.uid()));

-- on signup: profile + personal workspace
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)));
  INSERT INTO public.organizations (name, created_by) VALUES ('Personal workspace', NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_org() FROM PUBLIC, anon, authenticated;