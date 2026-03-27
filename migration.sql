-- =========================================
-- +KWANZA V1.0 - Full Database Migration
-- Run this in Supabase SQL Editor
-- =========================================

-- First, drop existing tables to ensure a clean slate
DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.app_configuration CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.kyc_submissions CASCADE;
DROP TABLE IF EXISTS public.loans CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- Create custom types (using DROP TYPE first to avoid conflicts if they exist)
DROP TYPE IF EXISTS kyc_status_type CASCADE;
CREATE TYPE kyc_status_type AS ENUM ('not_started', 'pending', 'verified', 'rejected');

DROP TYPE IF EXISTS app_role CASCADE;
CREATE TYPE app_role AS ENUM ('admin', 'editor', 'user');

-- =====================
-- PROFILES TABLE
-- =====================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  email text,
  phone text,
  user_type text DEFAULT 'worker'::text,
  wallet_balance numeric DEFAULT 0,
  is_blocked boolean DEFAULT false,
  blocked_reason text,
  country text DEFAULT 'Angola'::text,
  access_count integer DEFAULT 0,
  last_access timestamptz,
  role text DEFAULT 'user'::text,
  nome text,
  referral_code text,
  referral_count integer DEFAULT 0,
  credit_limit numeric DEFAULT 500000,
  username text UNIQUE,
  must_change_password boolean DEFAULT false,
  kyc_status kyc_status_type DEFAULT 'not_started'::kyc_status_type,
  referred_by uuid REFERENCES public.profiles(id),
  score integer DEFAULT 600,
  status text DEFAULT 'PENDENTE'::text,
  manager_plafond numeric DEFAULT 0,
  bi text
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================
-- USER_ROLES TABLE
-- =====================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================
-- LOANS TABLE
-- =====================
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  months integer NOT NULL,
  interest_rate numeric DEFAULT 3.5,
  status text DEFAULT 'PENDENTE'::text CHECK (status = ANY (ARRAY['PENDENTE'::text, 'APROVADO'::text, 'PAGO'::text, 'ATRASADO'::text])),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- =====================
-- KYC_SUBMISSIONS TABLE
-- =====================
CREATE TABLE public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id),
  full_name text,
  bi_number text,
  bi_front_url text,
  bi_back_url text,
  selfie_url text,
  address_proof_url text,
  status kyc_status_type DEFAULT 'pending'::kyc_status_type,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  location jsonb,
  contacts jsonb,
  phone_number text,
  phone_verified boolean DEFAULT false
);

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- =====================
-- NOTIFICATIONS TABLE
-- =====================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  link text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- =====================
-- SYSTEM_SETTINGS TABLE
-- =====================
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb DEFAULT '{}'::jsonb NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =====================
-- APP_CONFIGURATION TABLE
-- =====================
CREATE TABLE public.app_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_configuration ENABLE ROW LEVEL SECURITY;

-- =====================
-- ADMIN_AUDIT_LOGS TABLE
-- =====================
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  admin_id uuid REFERENCES auth.users(id),
  action varchar NOT NULL,
  entity varchar NOT NULL,
  entity_id varchar,
  details jsonb,
  ip_address varchar,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================
-- ADD LOANS FK TO PROFILES
-- =====================
ALTER TABLE public.loans ADD CONSTRAINT loans_profiles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

-- =====================
-- HANDLE NEW USER TRIGGER
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, nome, role, status, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'nome', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'user'),
    'PENDENTE',
    'REF-' || (1000 + floor(random() * 9000))::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- HAS_ROLE FUNCTION
-- =====================
CREATE OR REPLACE FUNCTION public.has_role(check_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = check_role
  );
END;
$$;

-- =====================
-- RLS POLICIES
-- =====================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Managers can view client profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'manager')
  );

CREATE POLICY "Managers can update client profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'manager')
  );

-- User roles policies
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Loans policies
CREATE POLICY "Users can view own loans" ON public.loans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create loans" ON public.loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all loans" ON public.loans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Managers can view all loans" ON public.loans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'manager')
  );

CREATE POLICY "Managers can update loans" ON public.loans
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'manager')
  );

-- KYC policies
CREATE POLICY "Users can view own kyc" ON public.kyc_submissions
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.profiles WHERE profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own kyc" ON public.kyc_submissions
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.profiles WHERE profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can update own kyc" ON public.kyc_submissions
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.profiles WHERE profiles.user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all kyc" ON public.kyc_submissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admin audit logs policies
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- App configuration policies
CREATE POLICY "Anyone can read config" ON public.app_configuration
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage config" ON public.app_configuration
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
