-- ============================================================
-- 🎯 REPARAÇÃO RETROATIVA: APLICAR BÓNUS A INDICAÇÕES ANTIGAS
-- Este script identifica indicações que já existem mas ainda não
-- receberam o bónus de 200 pts e 200 Kz.
-- ============================================================

DO $$
DECLARE
    r RECORD;
    v_missing_count INTEGER := 0;
BEGIN
    -- 1. Identificar pares (Referenciador -> Indicado) que não têm transação de bónus
    FOR r IN 
        SELECT 
            referred.id AS referred_id,
            referred.nome AS referred_name,
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
        -- 2. Inserir Transação de Registro
        INSERT INTO public.transactions (user_id, type, amount, description)
        VALUES (r.referrer_uuid, 'BONUS', 200, 'Bónus Retroativo de indicação - ' || COALESCE(r.referred_name, 'Novo Usuário'));

        -- 3. Atualizar Perfil do Referenciador
        UPDATE public.profiles SET 
            score = COALESCE(score, 0) + 200,
            wallet_balance = COALESCE(wallet_balance, 0) + 200,
            referral_count = COALESCE(referral_count, 0) + 1
        WHERE id = r.referrer_id;

        v_missing_count := v_missing_count + 1;
    END LOOP;

    RAISE NOTICE 'Bónus retroativo aplicado a % indicações.', v_missing_count;
END $$;
