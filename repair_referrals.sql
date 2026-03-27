-- ==========================================
-- SCRIPT DE REPARAÇÃO DE REFERÊNCIAS
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- 1. Atualizar a função de Gatilho para respeitar o código do Admin/Registo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name, 
    nome, 
    role, 
    status, 
    referral_code
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'nome', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'user'),
    'ATIVO', -- O admin cria como ATIVO por padrão
    COALESCE(
      NEW.raw_user_meta_data ->> 'referral_code', 
      'REF-' || (1000 + floor(random() * 9000))::text
    )
  );
  RETURN NEW;
END;
$$;

-- 2. Sincronizar todos os códigos existentes (Auth Meta -> Profiles Table)
UPDATE public.profiles p
SET referral_code = u.raw_user_meta_data->>'referral_code'
FROM auth.users u
WHERE p.user_id = u.id
AND u.raw_user_meta_data->>'referral_code' IS NOT NULL;

-- 3. Garantir que os nomes também estão sincronizados
UPDATE public.profiles p
SET nome = COALESCE(u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'full_name', p.nome)
FROM auth.users u
WHERE p.user_id = u.id;

-- Dica: O código "REF-5123" do Lima agora será o correto do sistema!
