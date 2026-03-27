-- 1. Criar a tabela de transações
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'BONUS', 'SAQUE', 'DEPOSITO', 'PAGAMENTO'
    amount NUMERIC NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acesso
CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id);

-- 4. Inserir bônus iniciais para quem já tem indicações (Sincronização opcional)
INSERT INTO public.transactions (user_id, type, amount, description)
SELECT user_id, 'BONUS', score, 'Bônus acumulado de indicações'
FROM public.profiles
WHERE score > 0;
