-- ==========================================
-- Migration: Sistema de Chat com Gamificação
-- Execute no SQL Editor do Supabase
-- ==========================================

-- 1. Criação das Tabelas Base
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text,
    description text,
    type text NOT NULL CHECK (type IN ('PUBLIC', 'PRIVATE')),
    created_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
    room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    role text DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
    joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    content text,
    type text NOT NULL DEFAULT 'TEXT' CHECK (type IN ('TEXT', 'AUDIO', 'IMAGE', 'SYSTEM')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_blocks (
    blocker_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    blocked_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id)
);

-- 2. Inserir Sala Pública Global (Se não existir)
INSERT INTO public.chat_rooms (name, description, type)
SELECT 'Chat Global +Kwanzas', 'Bem-vindo ao chat da comunidade +Kwanzas!', 'PUBLIC'
WHERE NOT EXISTS (SELECT 1 FROM public.chat_rooms WHERE type = 'PUBLIC');

-- 3. Função Automática para Actualizar `updated_at`
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_rooms_updated_at ON public.chat_rooms;
CREATE TRIGGER handle_rooms_updated_at 
BEFORE UPDATE ON public.chat_rooms
FOR EACH ROW EXECUTE FUNCTION update_chat_updated_at();

-- ==========================================
-- 4. MOTOR DE GAMIFICAÇÃO & LIMITAÇÕES DE CHAT (Triggers Mágicos)
-- ==========================================

CREATE OR REPLACE FUNCTION check_chat_message_limits()
RETURNS TRIGGER AS $$
DECLARE
    v_score INTEGER;
    v_msgs_today INTEGER;
    v_max_msgs INTEGER;
    v_type text;
BEGIN
    -- 1. Obter o score do utilizador
    SELECT score INTO v_score FROM public.profiles WHERE user_id = NEW.user_id;
    IF v_score IS NULL THEN
        v_score := 0;
    END IF;

    -- 2. Definir os limites de mensagens por dia com base nos PONTOS (Nível)
    -- Iniciante (0 - 199 pts): 2 msgs
    -- Bronze (200 - 399 pts): 5 msgs
    -- Prata (400 - 599 pts): 10 msgs
    -- Ouro (600 - 799 pts): Ilimitado
    -- Platina (800 - 999 pts): Ilimitado
    -- Presidente (1000+ pts): Ilimitado
    
    IF v_score >= 600 THEN
        v_max_msgs := 999999; -- Infinito na prática
    ELSIF v_score >= 400 THEN
        v_max_msgs := 10;
    ELSIF v_score >= 200 THEN
        v_max_msgs := 5;
    ELSE
        v_max_msgs := 2;
    END IF;

    -- 3. Bloqueio de funcionalidade AUDIO (Apenas Presidente - 1000 pts)
    IF NEW.type = 'AUDIO' AND v_score < 1000 THEN
        RAISE EXCEPTION 'Apenas usuários nível Presidente podem enviar mensagens de áudio.';
    END IF;

    -- 4. Contar mensagens enviadas HOJE pelo utilizador
    -- Otimização: Apenas contar se o limite não for infinito
    IF v_max_msgs < 999999 THEN
        SELECT COUNT(*) INTO v_msgs_today 
        FROM public.chat_messages 
        WHERE user_id = NEW.user_id AND created_at >= CURRENT_DATE;

        -- Lançar erro de bloqueio se ultrapassado
        IF v_msgs_today >= v_max_msgs THEN
            RAISE EXCEPTION 'Limite diário de mensagens atingido para o seu nível (Máximo: %). Aumente a sua pontuação (Score = %) para enviar mais.', v_max_msgs, v_score;
        END IF;
    END IF;
    
    -- 5. Validar bloqueios: Se o user_id foi bloqueado por algum membro da sala
    -- (Proteção básica para chats privados)
    -- Simplificação: Em Private chats (onde só há 2 membros), se um bloqueou o outro não passa
    SELECT type INTO v_type FROM public.chat_rooms WHERE id = NEW.room_id;
    IF v_type = 'PRIVATE' THEN
        IF EXISTS (
            SELECT 1 FROM public.chat_participants p
            JOIN public.chat_blocks b ON b.blocker_id = p.user_id
            WHERE p.room_id = NEW.room_id AND b.blocked_id = NEW.user_id
        ) THEN
            RAISE EXCEPTION 'Você foi bloqueado e não pode enviar mensagens nesta sala.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_chat_limits ON public.chat_messages;
CREATE TRIGGER enforce_chat_limits 
BEFORE INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION check_chat_message_limits();

-- ==========================================
-- 5. ACTIVAR REALTIME (Fundamental para o Chat)
-- ==========================================
-- Isto permite subscrever as mensagens num canal WebSocket do cliente.
begin;
  -- remover e adicionar de novo por precaução
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.chat_messages;

-- ==========================================
-- 6. POLÍTICAS DE SEGURANÇA (RLS)
-- ==========================================

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_blocks ENABLE ROW LEVEL SECURITY;

-- ==== CHAT ROOMS ====
-- Toda a gente vê o Public Room
CREATE POLICY "Anyone can view PUBLIC rooms" 
ON public.chat_rooms FOR SELECT 
USING (type = 'PUBLIC');

-- Membros vêem os seus PRIVATE rooms
CREATE POLICY "Members can view PRIVATE rooms" 
ON public.chat_rooms FOR SELECT 
USING (
    type = 'PRIVATE' AND 
    EXISTS (SELECT 1 FROM public.chat_participants WHERE room_id = id AND user_id = auth.uid())
);

-- Users Platina (Score >= 800) podem criar PRIVATE rooms
CREATE POLICY "Platina users can create PRIVATE rooms" 
ON public.chat_rooms FOR INSERT 
WITH CHECK (
    type = 'PRIVATE' AND 
    auth.uid() = created_by AND 
    (SELECT score FROM public.profiles WHERE user_id = auth.uid()) >= 800
);

-- ==== CHAT PARTICIPANTS ====
-- Podes ver participantes de salas Públicas ou as tuas Privadas
CREATE POLICY "Can view participants of accessible rooms" 
ON public.chat_participants FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_id AND type = 'PUBLIC')
    OR 
    EXISTS (SELECT 1 FROM public.chat_participants my_p WHERE my_p.room_id = room_id AND my_p.user_id = auth.uid())
);

-- Qualquer um pode juntar-se à sala Publica
CREATE POLICY "Users can join PUBLIC rooms" 
ON public.chat_participants FOR INSERT 
WITH CHECK (
    user_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_id AND type = 'PUBLIC')
);

-- Criadores de salas privadas (Platina) podem adicionar outros
CREATE POLICY "Creator can add to PRIVATE rooms" 
ON public.chat_participants FOR INSERT 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_id AND created_by = auth.uid() AND type = 'PRIVATE')
);

-- ==== CHAT MESSAGES ====
-- Ler mensagens: Mesma regra dos participants
CREATE POLICY "Can read messages in accessible rooms" 
ON public.chat_messages FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_id AND type = 'PUBLIC')
    OR 
    EXISTS (SELECT 1 FROM public.chat_participants my_p WHERE my_p.room_id = room_id AND my_p.user_id = auth.uid())
);

-- Inserir mensagens: Tem de ser na sua sala, com o seu ID. (O trigger já trata dos limites de limite diário)
CREATE POLICY "Can insert messages to participating rooms" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.chat_participants WHERE room_id = room_id AND user_id = auth.uid())
);

-- ==== CHAT BLOCKS ====
-- Apenas Nível Presidente (Score >= 1000) pode bloquear
CREATE POLICY "President can insert blocks" 
ON public.chat_blocks FOR INSERT 
WITH CHECK (
    blocker_id = auth.uid() AND 
    (SELECT score FROM public.profiles WHERE user_id = auth.uid()) >= 1000
);

CREATE POLICY "Can view own blocks" 
ON public.chat_blocks FOR SELECT 
USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

CREATE POLICY "Can remove own blocks" 
ON public.chat_blocks FOR DELETE 
USING (blocker_id = auth.uid());

-- NOTAS FINAIS:
COMMENT ON TABLE public.chat_messages IS 'Tabela que regista mensagens. Tem RLS e Triggers para aplicar Limites Diários baseados no Gamification Score.';
