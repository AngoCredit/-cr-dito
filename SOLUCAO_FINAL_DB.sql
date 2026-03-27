-- ============================================================
-- 🚀 REPARAÇÃO COMPLETA: +KWANZAS SISTEMA (CONSIDERAÇÕES FINAIS)
-- Execute este script no SQL Editor do seu projeto Supabase atual.
-- Projeto ID esperado: zqjrdbytakszqqouazue
-- ============================================================

-- 1. TABELA DE CONVITES (INVITES)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invites (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    code text UNIQUE NOT NULL,
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED')),
    used_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view invites" ON public.invites;
CREATE POLICY "Anyone can view invites" ON public.invites FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own invites" ON public.invites;
CREATE POLICY "Users can insert their own invites" ON public.invites FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can update invites" ON public.invites;
CREATE POLICY "Authenticated users can update invites" ON public.invites FOR UPDATE USING (true);

-- 2. FUNÇÃO DE BÓNUS DE REFERÊNCIA (SEGURA)
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_referral_bonus(
    p_invite_code text,
    p_new_user_id uuid,
    p_new_user_name text
)
RETURNS jsonb AS $$
DECLARE
    v_invite record;
    v_referrer record;
    v_new_profile_id uuid;
BEGIN
    SELECT id, user_id INTO v_invite FROM public.invites WHERE code = p_invite_code AND status = 'ACTIVE';
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Convite não encontrado ou já usado'); END IF;

    SELECT id, user_id, referral_count, score, wallet_balance INTO v_referrer FROM public.profiles WHERE user_id = v_invite.user_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Referenciador não encontrado'); END IF;

    SELECT id INTO v_new_profile_id FROM public.profiles WHERE user_id = p_new_user_id;

    -- Atribuir bónus (+200 pts, +200 Kz)
    UPDATE public.profiles SET 
        referral_count = COALESCE(referral_count, 0) + 1,
        score = COALESCE(score, 0) + 200,
        wallet_balance = COALESCE(wallet_balance, 0) + 200
    WHERE id = v_referrer.id;

    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (v_referrer.user_id, 'BONUS', 200, 'Bónus de indicação - ' || p_new_user_name);

    UPDATE public.invites SET status = 'USED', used_by = v_new_profile_id WHERE id = v_invite.id;

    IF v_new_profile_id IS NOT NULL THEN
        UPDATE public.profiles SET referred_by = v_referrer.id WHERE id = v_new_profile_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'new_score', (SELECT score FROM public.profiles WHERE id = v_referrer.id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. SISTEMA DE CHAT (TABELAS E REGRAS)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text, type text NOT NULL CHECK (type IN ('PUBLIC', 'PRIVATE')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    content text, type text NOT NULL DEFAULT 'TEXT',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
    room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    PRIMARY KEY (room_id, user_id)
);

-- Garantir Sala Pública
INSERT INTO public.chat_rooms (name, type) SELECT 'Chat Global +Kwanzas', 'PUBLIC' 
WHERE NOT EXISTS (SELECT 1 FROM public.chat_rooms WHERE type = 'PUBLIC');

-- 4. TRIGGER DE LIMITAÇÃO DE CHAT POR NÍVEL
-- ============================================================
CREATE OR REPLACE FUNCTION check_chat_message_limits()
RETURNS TRIGGER AS $$
DECLARE
    v_score INTEGER;
    v_msgs_today INTEGER;
    v_max_msgs INTEGER;
BEGIN
    SELECT score INTO v_score FROM public.profiles WHERE user_id = NEW.user_id;
    v_score := COALESCE(v_score, 0);

    IF v_score >= 600 THEN v_max_msgs := 999999;
    ELSIF v_score >= 400 THEN v_max_msgs := 10;
    ELSIF v_score >= 200 THEN v_max_msgs := 5;
    ELSE v_max_msgs := 2;
    END IF;

    IF v_max_msgs < 999999 THEN
        SELECT COUNT(*) INTO v_msgs_today FROM public.chat_messages 
        WHERE user_id = NEW.user_id AND created_at >= CURRENT_DATE;
        IF v_msgs_today >= v_max_msgs THEN
            RAISE EXCEPTION 'Limite diário de mensagens atingido para o seu nível (Máximo: %).', v_max_msgs;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_chat_limits ON public.chat_messages;
CREATE TRIGGER enforce_chat_limits BEFORE INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION check_chat_message_limits();

-- 5. ACTIVAR REALTIME
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;
END $$;

-- RLS SIMPLIFICADO PARA O CHAT
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public rooms viewable" ON public.chat_rooms;
CREATE POLICY "Public rooms viewable" ON public.chat_rooms FOR SELECT USING (type = 'PUBLIC');

DROP POLICY IF EXISTS "Everyone reads messages" ON public.chat_messages;
CREATE POLICY "Everyone reads messages" ON public.chat_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can post" ON public.chat_messages;
CREATE POLICY "Authenticated users can post" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. PERMISSÃO PARA DELETAR UTILIZADORES (FIX CONSTRAINTS)
-- ============================================================
-- Resolve o erro de violação de chave estrangeira ao deletar perfis
ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_profiles_user_id_fkey;
ALTER TABLE public.loans ADD CONSTRAINT loans_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.kyc_submissions DROP CONSTRAINT IF EXISTS kyc_submissions_user_id_fkey;
ALTER TABLE public.kyc_submissions ADD CONSTRAINT kyc_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_referred_by_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- 7. REPARAÇÃO RETROATIVA: APLICAR BÓNUS A INDICAÇÕES ANTIGAS
-- ============================================================
DO $$
DECLARE
    r RECORD;
    v_missing_count INTEGER := 0;
BEGIN
    FOR r IN 
        SELECT 
            referred.id AS referred_id,
            COALESCE(referred.nome, 'Novo Usuário') AS referred_name,
            referrer.id AS referrer_id,
            referrer.user_id AS referrer_uuid
        FROM public.profiles referred
        JOIN public.profiles referrer ON referred.referred_by = referrer.id
        WHERE NOT EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.user_id = referrer.user_id
            AND t.type = 'BONUS'
            AND t.description ILIKE '%' || referred.nome || '%'
        )
    LOOP
        INSERT INTO public.transactions (user_id, type, amount, description)
        VALUES (r.referrer_uuid, 'BONUS', 200, 'Bónus Retroativo de indicação - ' || r.referred_name);

        UPDATE public.profiles SET 
            score = COALESCE(score, 0) + 200,
            wallet_balance = COALESCE(wallet_balance, 0) + 200,
            referral_count = COALESCE(referral_count, 0) + 1
        WHERE id = r.referrer_id;

        v_missing_count := v_missing_count + 1;
    END LOOP;
    RAISE NOTICE 'Bónus retroativo aplicado a % indicações.', v_missing_count;
END $$;

