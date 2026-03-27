-- ============================================================
-- SCRIPT DE CORREÇÃO: BÓNUS DE REFERÊNCIA AVANÇADO E DISTRIBUÍDO
-- Execute este script no SQL Editor do seu projeto Supabase atual.
-- Este script garante que Administradores NÃO ganham fundos ao convidar utilizadores.
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

    SELECT id, user_id, referral_count, score, wallet_balance, role INTO v_referrer FROM public.profiles WHERE user_id = v_invite.user_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Referenciador não encontrado'); END IF;

    SELECT id INTO v_new_profile_id FROM public.profiles WHERE user_id = p_new_user_id;

    -- Se o referenciador NÃO for Admin nem Manager (seja cliente regular)
    IF v_referrer.role NOT IN ('admin', 'manager') THEN
        -- Atribuir bónus financeiro e de score (+200 pts, +200 Kz) apenas a clientes
        UPDATE public.profiles SET 
            referral_count = COALESCE(referral_count, 0) + 1,
            score = COALESCE(score, 0) + 200,
            wallet_balance = COALESCE(wallet_balance, 0) + 200
        WHERE id = v_referrer.id;

        INSERT INTO public.transactions (user_id, type, amount, description)
        VALUES (v_referrer.user_id, 'BONUS', 200, 'Bónus de indicação - ' || p_new_user_name);
    ELSE
        -- Se for Administrador/Manager, apenas contabilizar a indicação (sem bónus financeiro)
        UPDATE public.profiles SET 
            referral_count = COALESCE(referral_count, 0) + 1
        WHERE id = v_referrer.id;
    END IF;

    -- Queimar o convite antigo
    UPDATE public.invites SET status = 'USED', used_by = v_new_profile_id WHERE id = v_invite.id;

    -- Ligar o cliente novo ao seu "Patrocinador"
    IF v_new_profile_id IS NOT NULL THEN
        UPDATE public.profiles SET referred_by = v_referrer.id WHERE id = v_new_profile_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'new_score', (SELECT COALESCE(score, 0) FROM public.profiles WHERE id = v_referrer.id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
