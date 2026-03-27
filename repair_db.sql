-- 0. Garantir coluna level e score (como plano de contingência)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level text DEFAULT 'Iniciante';
ALTER TABLE public.profiles ALTER COLUMN score SET DEFAULT 0;

-- 1. Sincronizar trigger para respeitar metadados (importante para Admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, nome, role, status, referral_code, score)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'nome', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'user'),
    'PENDENTE',
    COALESCE(NEW.raw_user_meta_data ->> 'referral_code', 'REF-' || (1000 + floor(random() * 9000))::text),
    0
  );
  RETURN NEW;
END;
$$;

-- 2. Repair Score e Códigos (Sincronização Final)
UPDATE public.profiles 
SET 
  referral_code = COALESCE(referral_code, 'REF-' || (1000 + floor(random() * 9000))::text),
  score = COALESCE(referral_count, 0) * 200;

-- 3. Função de Nível
CREATE OR REPLACE FUNCTION public.update_profile_level()
RETURNS trigger AS $$
BEGIN
    NEW.level := CASE 
        WHEN NEW.score >= 1000 THEN 'Presidente'
        WHEN NEW.score >= 800 THEN 'Platina'
        WHEN NEW.score >= 600 THEN 'Ouro'
        WHEN NEW.score >= 400 THEN 'Prata'
        WHEN NEW.score >= 200 THEN 'Bronze'
        ELSE 'Iniciante'
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger de Nível
DROP TRIGGER IF EXISTS tr_update_profile_level ON public.profiles;
CREATE TRIGGER tr_update_profile_level
BEFORE INSERT OR UPDATE OF score ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_profile_level();

-- 5. Atualizar níveis finais
UPDATE public.profiles SET score = score;
