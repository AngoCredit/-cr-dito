-- ==========================================
-- FIX: Permissão para Deletar Utilizadores (Constraints)
-- Execute no SQL Editor do Supabase
-- ==========================================

-- 1. FIX na tabela LOANS
-- Remove a restrição que impede deletar perfis com empréstimos
ALTER TABLE public.loans 
DROP CONSTRAINT IF EXISTS loans_profiles_user_id_fkey;

ALTER TABLE public.loans 
ADD CONSTRAINT loans_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 2. FIX na tabela KYC_SUBMISSIONS
-- Remove a restrição que impede deletar perfis com submissões de KYC
ALTER TABLE public.kyc_submissions 
DROP CONSTRAINT IF EXISTS kyc_submissions_user_id_fkey;

ALTER TABLE public.kyc_submissions 
ADD CONSTRAINT kyc_submissions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. FIX na tabela PROFILES (Auto-referência)
-- Permite deletar um utilizador mesmo que ele seja o referenciador de outros
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_referred_by_fkey;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_referred_by_fkey 
FOREIGN KEY (referred_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. FIX na tabela TRANSACTIONS (Caso a constraint antiga não tenha CASCADE)
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
