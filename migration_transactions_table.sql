-- ==========================================
-- Migration: Tabela de Transações (Transactions)
-- Execute no SQL Editor do Supabase
-- ==========================================

-- 1. Criar tabela transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    type text NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'BONUS')),
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'REJECTED')),
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Função para actualizar o updated_at
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger para updated_at
DROP TRIGGER IF EXISTS handle_updated_at ON public.transactions;
CREATE TRIGGER handle_updated_at 
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION update_transactions_updated_at();

-- 3. Políticas de Segurança (Row Level Security)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Utilizadores podem ver as suas próprias transações
CREATE POLICY "Users can view their own transactions" 
ON public.transactions FOR SELECT 
USING (auth.uid() = user_id);

-- Utilizadores podem inserir os seus próprios pedidos (ex: saque)
CREATE POLICY "Users can insert their own transactions" 
ON public.transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Apenas Admins ou o sistema (funções) podem actualizar (APROVAR/REJEITAR)
CREATE POLICY "Only admins can update transactions" 
ON public.transactions FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'manager')
  )
);

-- 4. Comentários
COMMENT ON TABLE public.transactions IS 'Tabela que regista o histórico de movimentos da carteira e pedidos de saque (withdrawals).';
