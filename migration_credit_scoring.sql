-- ==========================================
-- Migration: Campos de Credit Scoring nos Empréstimos
-- Execute no SQL Editor do Supabase
-- ==========================================

-- 1. Adicionar campos de scoring à tabela loans
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS credit_score integer;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS score_breakdown jsonb;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS credit_decision text;

-- 2. Comentários para documentação
COMMENT ON COLUMN public.loans.credit_score IS 'Pontuação de 0 a 1000 calculada no momento da solicitação';
COMMENT ON COLUMN public.loans.score_breakdown IS 'Detalhe técnico por fator (histórico, rendimento, endividamento, estabilidade)';
COMMENT ON COLUMN public.loans.credit_decision IS 'Decisão automática (APROVADO, ANALISE_MANUAL, REJEITADO)';
