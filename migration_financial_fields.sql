-- ==========================================
-- Migration: Adicionar campos financeiros ao perfil e empréstimos
-- Execute no SQL Editor do Supabase
-- ==========================================

-- 1. Adicionar campos financeiros à tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS empresa text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS salario numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iban text;

-- 2. Adicionar campos ao empréstimo
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS payment_method text;

-- 3. Adicionar campo de recibo salarial ao kyc_submissions
ALTER TABLE public.kyc_submissions ADD COLUMN IF NOT EXISTS salary_receipt_url text;

-- 4. Sincronizar dados existentes do auth metadata para profiles
-- (para utilizadores já registados cujos dados ficaram apenas no metadata)
UPDATE public.profiles p
SET 
    empresa = COALESCE(p.empresa, (SELECT raw_user_meta_data->>'empresa' FROM auth.users u WHERE u.id = p.user_id)),
    cargo = COALESCE(p.cargo, (SELECT raw_user_meta_data->>'cargo' FROM auth.users u WHERE u.id = p.user_id)),
    salario = COALESCE(p.salario, (SELECT (raw_user_meta_data->>'salario')::numeric FROM auth.users u WHERE u.id = p.user_id AND raw_user_meta_data->>'salario' IS NOT NULL)),
    iban = COALESCE(p.iban, (SELECT raw_user_meta_data->>'iban' FROM auth.users u WHERE u.id = p.user_id))
WHERE p.empresa IS NULL OR p.cargo IS NULL;
