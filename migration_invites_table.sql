-- ==========================================
-- Migration: Tabela de Convites Únicos (Invites)
-- Execute no SQL Editor do Supabase
-- ==========================================

-- 1. Criar tabela invites
CREATE TABLE IF NOT EXISTS public.invites (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    code text UNIQUE NOT NULL,
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED')),
    used_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Função para actualizar o updated_at (reutiliza a função standard)
CREATE OR REPLACE FUNCTION update_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger para updated_at
DROP TRIGGER IF EXISTS handle_invites_updated_at ON public.invites;
CREATE TRIGGER handle_invites_updated_at 
BEFORE UPDATE ON public.invites
FOR EACH ROW EXECUTE FUNCTION update_invites_updated_at();

-- 4. Políticas de Segurança (Row Level Security)
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Utilizadores podem ver os seus próprios convites gerados
CREATE POLICY "Users can view their own generated invites" 
ON public.invites FOR SELECT 
USING (auth.uid() = user_id);

-- O sistema precisa de permitir a validação de um código por pessoas não-autenticadas 
-- (no ecrã de registo). Portanto, todos podem LER um convite pelo código específico, 
-- mas apenas para verificar o status. 
-- Como o RLS bloqueia ler sem Auth por padrão se for restritivo, vamos permitir a 
-- leitura pública do status de um convite:
CREATE POLICY "Anyone can view an invite by code" 
ON public.invites FOR SELECT 
USING (true);

-- Utilizadores podem INSERIR os seus próprios convites
CREATE POLICY "Users can insert their own invites" 
ON public.invites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- A actualização do status ('USED') será feita com privilégios de admin (service_role) 
-- ou definindo uma regra específica: o futuro utilizador poderá actualizar APENAS se 
-- ele for o used_by? O mais simples é garantir que a actualização requer autenticação 
-- e será feita durante o fluxo servidor.
-- No entanto, o lado cliente faz request directo no Supabase. Para que o Registo 
-- actualize o invite após criar a conta, o recém-registado utilizador é o `used_by`:
CREATE POLICY "Users can mark invites as used for themselves" 
ON public.invites FOR UPDATE 
USING (auth.uid() = used_by OR auth.uid() = user_id);

-- 5. Comentários
COMMENT ON TABLE public.invites IS 'Tabela que regista códigos de convite únicos gerados pelos utilizadores (limite máximo de 5 por utilizador nas regras da UI).';
