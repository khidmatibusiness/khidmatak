
-- =============================================================
-- 1. WALLETS: secure unique codes + roundup/piggy fields
-- =============================================================

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS roundup_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS roundup_mode text NOT NULL DEFAULT 'save',
  ADD COLUMN IF NOT EXISTS roundup_charity_id uuid REFERENCES public.wallets(id),
  ADD COLUMN IF NOT EXISTS piggy_balance numeric NOT NULL DEFAULT 0;

ALTER TABLE public.wallets
  DROP CONSTRAINT IF EXISTS wallets_roundup_mode_chk;
ALTER TABLE public.wallets
  ADD CONSTRAINT wallets_roundup_mode_chk CHECK (roundup_mode IN ('save','donate'));

-- secure code generator: 12 chars, base32-ish (no ambiguous 0/O/1/I)
CREATE OR REPLACE FUNCTION public.generate_wallet_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  rnd int;
  exists_already boolean;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..12 LOOP
      rnd := floor(random() * length(alphabet))::int + 1;
      code := code || substr(alphabet, rnd, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.wallets WHERE wallet_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- backfill any wallets without a 12-char code
DO $$
DECLARE w_id uuid;
BEGIN
  FOR w_id IN SELECT id FROM public.wallets WHERE wallet_code IS NULL OR length(wallet_code) <> 12 LOOP
    UPDATE public.wallets SET wallet_code = public.generate_wallet_code() WHERE id = w_id;
  END LOOP;
END $$;

-- enforce uniqueness + new default
ALTER TABLE public.wallets ALTER COLUMN wallet_code SET DEFAULT public.generate_wallet_code();
CREATE UNIQUE INDEX IF NOT EXISTS wallets_wallet_code_unique ON public.wallets(wallet_code);

-- ensure platform escrow wallet exists
INSERT INTO public.wallets (user_id, balance, currency, wallet_code)
VALUES ('00000000-0000-0000-0000-000000000001', 0, 'JOD', public.generate_wallet_code())
ON CONFLICT DO NOTHING;

-- =============================================================
-- 2. ESCROW BOOKING FLOW
-- =============================================================

-- replace old confirm_booking_payment: now moves customer -> platform escrow + handles roundup
CREATE OR REPLACE FUNCTION public.confirm_booking_payment(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_customer_wallet uuid;
  v_platform_wallet uuid;
  v_charge numeric;
  v_roundup numeric := 0;
  v_charge_total numeric;
  v_roundup_enabled boolean;
  v_roundup_mode text;
  v_charity_id uuid;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF v_booking.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.customer_id <> auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;

  SELECT id, roundup_enabled, roundup_mode, roundup_charity_id
    INTO v_customer_wallet, v_roundup_enabled, v_roundup_mode, v_charity_id
  FROM public.wallets WHERE user_id = v_booking.customer_id;

  SELECT id INTO v_platform_wallet FROM public.wallets
    WHERE user_id = '00000000-0000-0000-0000-000000000001';

  v_charge := v_booking.total_amount;
  IF v_roundup_enabled THEN
    v_roundup := ceil(v_charge) - v_charge;
  END IF;
  v_charge_total := v_charge + v_roundup;

  IF (SELECT balance FROM public.wallets WHERE id = v_customer_wallet) < v_charge_total THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- escrow hold: customer -> platform escrow
  UPDATE public.wallets SET balance = balance - v_charge WHERE id = v_customer_wallet;
  UPDATE public.wallets SET balance = balance + v_charge WHERE id = v_platform_wallet;
  INSERT INTO public.wallet_transactions (from_wallet_id, to_wallet_id, amount, type, reference_id, note)
  VALUES (v_customer_wallet, v_platform_wallet, v_charge, 'escrow_hold', p_booking_id, 'Booking escrow');

  -- roundup
  IF v_roundup > 0 THEN
    UPDATE public.wallets SET balance = balance - v_roundup WHERE id = v_customer_wallet;
    IF v_roundup_mode = 'donate' AND v_charity_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + v_roundup WHERE id = v_charity_id;
      INSERT INTO public.wallet_transactions (from_wallet_id, to_wallet_id, amount, type, reference_id, note)
      VALUES (v_customer_wallet, v_charity_id, v_roundup, 'roundup_donation', p_booking_id, 'Round-up donation');
    ELSE
      UPDATE public.wallets SET piggy_balance = piggy_balance + v_roundup WHERE id = v_customer_wallet;
      INSERT INTO public.wallet_transactions (from_wallet_id, to_wallet_id, amount, type, reference_id, note)
      VALUES (v_customer_wallet, v_customer_wallet, v_roundup, 'roundup_save', p_booking_id, 'Round-up to piggy');
    END IF;
  END IF;

  UPDATE public.bookings SET status = 'in_escrow' WHERE id = p_booking_id;
END;
$$;

-- complete_booking: business clicks "job done", releases escrow -> pro + commission
CREATE OR REPLACE FUNCTION public.complete_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_pro_wallet uuid;
  v_platform_wallet uuid;
  v_pro_amount numeric;
  v_commission numeric;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF v_booking.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.pro_id <> auth.uid() THEN RAISE EXCEPTION 'Only the service provider can complete this booking'; END IF;
  IF v_booking.status NOT IN ('in_escrow','pending','confirmed') THEN
    RAISE EXCEPTION 'Booking cannot be completed in current status (%)', v_booking.status;
  END IF;

  IF v_booking.payment_method = 'wallet' AND v_booking.status = 'in_escrow' THEN
    SELECT id INTO v_pro_wallet FROM public.wallets WHERE user_id = v_booking.pro_id;
    SELECT id INTO v_platform_wallet FROM public.wallets WHERE user_id = '00000000-0000-0000-0000-000000000001';
    v_commission := round((v_booking.total_amount * 0.15)::numeric, 2);
    v_pro_amount := v_booking.total_amount - v_commission;

    UPDATE public.wallets SET balance = balance - v_booking.total_amount WHERE id = v_platform_wallet;
    UPDATE public.wallets SET balance = balance + v_pro_amount WHERE id = v_pro_wallet;
    UPDATE public.wallets SET balance = balance + v_commission WHERE id = v_platform_wallet;

    INSERT INTO public.wallet_transactions (from_wallet_id, to_wallet_id, amount, type, reference_id, note)
    VALUES
      (v_platform_wallet, v_pro_wallet, v_pro_amount, 'booking_payment', p_booking_id, 'Job done — escrow released'),
      (v_platform_wallet, v_platform_wallet, v_commission, 'commission', p_booking_id, 'Platform commission');
  END IF;

  UPDATE public.bookings SET status = 'completed' WHERE id = p_booking_id;
END;
$$;

-- update cancel_booking to refund escrow cleanly
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_customer_wallet uuid;
  v_platform_wallet uuid;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF v_booking.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.customer_id <> auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF v_booking.status NOT IN ('pending','in_escrow') THEN
    RAISE EXCEPTION 'Only pending bookings can be cancelled';
  END IF;

  UPDATE public.bookings SET status = 'cancelled' WHERE id = p_booking_id;

  IF v_booking.payment_method = 'wallet' AND v_booking.status = 'in_escrow' THEN
    SELECT id INTO v_customer_wallet FROM public.wallets WHERE user_id = v_booking.customer_id;
    SELECT id INTO v_platform_wallet FROM public.wallets WHERE user_id = '00000000-0000-0000-0000-000000000001';

    UPDATE public.wallets SET balance = balance + v_booking.total_amount WHERE id = v_customer_wallet;
    UPDATE public.wallets SET balance = balance - v_booking.total_amount WHERE id = v_platform_wallet;

    INSERT INTO public.wallet_transactions (from_wallet_id, to_wallet_id, amount, type, reference_id, note)
    VALUES (v_platform_wallet, v_customer_wallet, v_booking.total_amount, 'refund', p_booking_id, 'Booking cancelled — escrow refunded');
  END IF;

  RETURN jsonb_build_object('status','cancelled','refunded', v_booking.payment_method = 'wallet' AND v_booking.status = 'in_escrow');
END;
$$;

-- =============================================================
-- 3. TRANSFER REQUESTS (request money + accept/reject/withdraw)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tr_select_own" ON public.transfer_requests;
CREATE POLICY "tr_select_own" ON public.transfer_requests
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR recipient_id = auth.uid());

DROP POLICY IF EXISTS "tr_insert_own" ON public.transfer_requests;
CREATE POLICY "tr_insert_own" ON public.transfer_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "tr_update_participants" ON public.transfer_requests;
CREATE POLICY "tr_update_participants" ON public.transfer_requests
  FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR recipient_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() OR recipient_id = auth.uid());

CREATE INDEX IF NOT EXISTS transfer_requests_recipient_idx ON public.transfer_requests(recipient_id, status);
CREATE INDEX IF NOT EXISTS transfer_requests_requester_idx ON public.transfer_requests(requester_id, status);

CREATE OR REPLACE FUNCTION public.request_transfer(p_recipient_code text, p_amount numeric, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_user uuid;
  v_id uuid;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  SELECT user_id INTO v_recipient_user FROM public.wallets WHERE wallet_code = p_recipient_code;
  IF v_recipient_user IS NULL THEN RAISE EXCEPTION 'Wallet code not found'; END IF;
  IF v_recipient_user = auth.uid() THEN RAISE EXCEPTION 'Cannot request from yourself'; END IF;

  INSERT INTO public.transfer_requests (requester_id, recipient_id, amount, note)
  VALUES (auth.uid(), v_recipient_user, p_amount, p_note)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_transfer(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.transfer_requests%ROWTYPE;
  v_recipient_wallet uuid;
  v_requester_wallet uuid;
BEGIN
  SELECT * INTO v_req FROM public.transfer_requests WHERE id = p_id FOR UPDATE;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.recipient_id <> auth.uid() THEN RAISE EXCEPTION 'Only the recipient can accept'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Request is no longer pending'; END IF;

  SELECT id INTO v_recipient_wallet FROM public.wallets WHERE user_id = v_req.recipient_id;
  SELECT id INTO v_requester_wallet FROM public.wallets WHERE user_id = v_req.requester_id;

  IF (SELECT balance FROM public.wallets WHERE id = v_recipient_wallet) < v_req.amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.wallets SET balance = balance - v_req.amount WHERE id = v_recipient_wallet;
  UPDATE public.wallets SET balance = balance + v_req.amount WHERE id = v_requester_wallet;

  INSERT INTO public.wallet_transactions (from_wallet_id, to_wallet_id, amount, type, reference_id, note)
  VALUES (v_recipient_wallet, v_requester_wallet, v_req.amount, 'transfer_request', v_req.id, v_req.note);

  UPDATE public.transfer_requests SET status='accepted', responded_at=now() WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_transfer(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_req public.transfer_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.transfer_requests WHERE id = p_id;
  IF v_req.recipient_id <> auth.uid() THEN RAISE EXCEPTION 'Only the recipient can reject'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Request is no longer pending'; END IF;
  UPDATE public.transfer_requests SET status='rejected', responded_at=now() WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_transfer(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_req public.transfer_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.transfer_requests WHERE id = p_id;
  IF v_req.requester_id <> auth.uid() THEN RAISE EXCEPTION 'Only the requester can withdraw'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Request is no longer pending'; END IF;
  UPDATE public.transfer_requests SET status='withdrawn', responded_at=now() WHERE id = p_id;
END;
$$;

-- =============================================================
-- 4. PIGGY / ROUND-UP MANAGEMENT
-- =============================================================

CREATE OR REPLACE FUNCTION public.set_roundup_settings(p_enabled boolean, p_mode text, p_charity_code text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_charity_wallet uuid;
BEGIN
  IF p_mode NOT IN ('save','donate') THEN RAISE EXCEPTION 'Invalid mode'; END IF;
  IF p_mode = 'donate' AND p_charity_code IS NOT NULL THEN
    SELECT id INTO v_charity_wallet FROM public.wallets WHERE wallet_code = p_charity_code;
    IF v_charity_wallet IS NULL THEN RAISE EXCEPTION 'Charity wallet not found'; END IF;
  END IF;
  UPDATE public.wallets
  SET roundup_enabled = p_enabled,
      roundup_mode = p_mode,
      roundup_charity_id = COALESCE(v_charity_wallet, roundup_charity_id)
  WHERE user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.piggy_to_wallet()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_wallet uuid; v_amount numeric;
BEGIN
  SELECT id, piggy_balance INTO v_wallet, v_amount FROM public.wallets WHERE user_id = auth.uid();
  IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'Piggy bank is empty'; END IF;
  UPDATE public.wallets SET piggy_balance = 0, balance = balance + v_amount WHERE id = v_wallet;
  INSERT INTO public.wallet_transactions (from_wallet_id, to_wallet_id, amount, type, note)
  VALUES (v_wallet, v_wallet, v_amount, 'piggy_release', 'Piggy bank moved to wallet');
  RETURN v_amount;
END;
$$;

CREATE OR REPLACE FUNCTION public.donate_piggy(p_charity_code text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_wallet uuid; v_amount numeric; v_charity uuid;
BEGIN
  SELECT id, piggy_balance INTO v_wallet, v_amount FROM public.wallets WHERE user_id = auth.uid();
  IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'Piggy bank is empty'; END IF;
  SELECT id INTO v_charity FROM public.wallets WHERE wallet_code = p_charity_code;
  IF v_charity IS NULL THEN RAISE EXCEPTION 'Charity wallet not found'; END IF;

  UPDATE public.wallets SET piggy_balance = 0 WHERE id = v_wallet;
  UPDATE public.wallets SET balance = balance + v_amount WHERE id = v_charity;
  INSERT INTO public.wallet_transactions (from_wallet_id, to_wallet_id, amount, type, note)
  VALUES (v_wallet, v_charity, v_amount, 'piggy_donation', 'Piggy bank donated');
  RETURN v_amount;
END;
$$;
