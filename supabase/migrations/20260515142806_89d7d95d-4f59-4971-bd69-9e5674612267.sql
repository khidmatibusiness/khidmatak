
UPDATE public.wallets SET wallet_code = public.generate_wallet_code() WHERE wallet_code IS NULL;

WITH ranked AS (
  SELECT id, user_id,
    row_number() OVER (PARTITION BY user_id ORDER BY balance DESC NULLS LAST, created_at ASC) AS rn
  FROM public.wallets
),
losers AS (SELECT id, user_id FROM ranked WHERE rn > 1),
keepers AS (SELECT id, user_id FROM ranked WHERE rn = 1),
_u1 AS (UPDATE public.wallet_transactions wt SET from_wallet_id = k.id FROM losers l JOIN keepers k ON k.user_id = l.user_id WHERE wt.from_wallet_id = l.id RETURNING 1),
_u2 AS (UPDATE public.wallet_transactions wt SET to_wallet_id = k.id FROM losers l JOIN keepers k ON k.user_id = l.user_id WHERE wt.to_wallet_id = l.id RETURNING 1),
_u3 AS (UPDATE public.topup_requests tr SET wallet_id = k.id FROM losers l JOIN keepers k ON k.user_id = l.user_id WHERE tr.wallet_id = l.id RETURNING 1),
_u4 AS (UPDATE public.withdrawal_requests wr SET wallet_id = k.id FROM losers l JOIN keepers k ON k.user_id = l.user_id WHERE wr.wallet_id = l.id RETURNING 1)
DELETE FROM public.wallets w USING losers l WHERE w.id = l.id;

ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_user_id_unique;
ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_unique UNIQUE (user_id);

ALTER TABLE public.wallets ALTER COLUMN wallet_code SET DEFAULT public.generate_wallet_code();

CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, wallet_code)
  VALUES (NEW.id, public.generate_wallet_code())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_wallet_for_user();
