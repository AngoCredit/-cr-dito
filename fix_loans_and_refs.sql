-- ==========================================
-- FIX: Empréstimos + Referências
-- Execute no SQL Editor do Supabase
-- ==========================================

-- 1. Corrigir constraint de status dos empréstimos (adicionar REJEITADO)
ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_status_check;
ALTER TABLE public.loans ADD CONSTRAINT loans_status_check 
  CHECK (status = ANY (ARRAY['PENDENTE'::text, 'APROVADO'::text, 'PAGO'::text, 'ATRASADO'::text, 'REJEITADO'::text]));

-- 2. Adicionar coluna de motivo de rejeição (se não existir)
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 3. Restaurar a referência original do admin (REF-3373)
-- Substitui o email abaixo pelo email do utilizador afectado, se diferente
UPDATE public.profiles 
SET referral_code = 'REF-3373'
WHERE referral_code = 'REF-0000';

-- 4. Corrigir perfis que tenham referral_code NULL (gerar aleatório)
UPDATE public.profiles 
SET referral_code = 'REF-' || (1000 + floor(random() * 9000))::text
WHERE referral_code IS NULL;
