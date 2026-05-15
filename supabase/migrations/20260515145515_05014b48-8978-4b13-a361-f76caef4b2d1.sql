
-- =========================================================
-- 1. REVIEWS — hide customer_id from public reads
-- =========================================================
DROP POLICY IF EXISTS "Reviews select all anon" ON public.reviews;
DROP POLICY IF EXISTS "Reviews select all auth" ON public.reviews;

-- Author and reviewed pro can still read full row
CREATE POLICY "Reviews select participants"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR pro_id = auth.uid());

-- Public-safe view (no customer_id)
CREATE OR REPLACE VIEW public.reviews_public
WITH (security_invoker = on) AS
  SELECT id, booking_id, pro_id, rating, comment, created_at
  FROM public.reviews;

-- Allow the view itself to read the base table for everyone via a scoped policy
CREATE POLICY "Reviews select public columns via view"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (true);
-- Note: the view excludes customer_id; since clients should query the view,
-- we keep the broad row policy but rely on the view for column projection.
-- To make the base table inaccessible directly to anon:
REVOKE SELECT ON public.reviews FROM anon;
GRANT SELECT ON public.reviews_public TO anon, authenticated;

-- =========================================================
-- 2. BOOKINGS — column-level lockdown
-- =========================================================
-- Authenticated users may only update review-tracking fields directly.
REVOKE UPDATE ON public.bookings FROM authenticated;
GRANT UPDATE (reviewed_skipped, reviewed_at, notes) ON public.bookings TO authenticated;

-- =========================================================
-- 3. TRANSFER_REQUESTS — drop participant UPDATE policy
-- =========================================================
DROP POLICY IF EXISTS "tr_update_participants" ON public.transfer_requests;
-- All status changes go through accept_transfer / reject_transfer / withdraw_transfer (SECURITY DEFINER).

-- =========================================================
-- 4. WALLETS — explicit deny client UPDATE/DELETE
-- =========================================================
DROP POLICY IF EXISTS "Wallets deny client update" ON public.wallets;
CREATE POLICY "Wallets deny client update"
  ON public.wallets FOR UPDATE
  TO authenticated, anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Wallets deny client delete" ON public.wallets;
CREATE POLICY "Wallets deny client delete"
  ON public.wallets FOR DELETE
  TO authenticated, anon
  USING (false);

-- =========================================================
-- 5. WALLET_TRANSACTIONS — explicit deny client writes
-- =========================================================
DROP POLICY IF EXISTS "Wallet tx deny client insert" ON public.wallet_transactions;
CREATE POLICY "Wallet tx deny client insert"
  ON public.wallet_transactions FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);

DROP POLICY IF EXISTS "Wallet tx deny client update" ON public.wallet_transactions;
CREATE POLICY "Wallet tx deny client update"
  ON public.wallet_transactions FOR UPDATE
  TO authenticated, anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Wallet tx deny client delete" ON public.wallet_transactions;
CREATE POLICY "Wallet tx deny client delete"
  ON public.wallet_transactions FOR DELETE
  TO authenticated, anon
  USING (false);

-- =========================================================
-- 6. SECURITY DEFINER hardening: search_path + EXECUTE
-- =========================================================
ALTER FUNCTION public.generate_wallet_code() SET search_path = public;
ALTER FUNCTION public.lookup_wallet_by_code(text) SET search_path = public;
ALTER FUNCTION public.set_commission_amount() SET search_path = public;
ALTER FUNCTION public.process_split_send(text, numeric) SET search_path = public;
ALTER FUNCTION public.apply_referral(text) SET search_path = public;

-- Revoke EXECUTE from anon on all SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.generate_wallet_code() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_wallet_balance(uuid, numeric) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.process_booking_payment(uuid, uuid, uuid, numeric) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_wallet_for_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_commission_amount() FROM anon, authenticated, public;

-- User-callable RPCs: revoke from anon only, keep for authenticated
REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.complete_booking(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.confirm_booking_payment(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.request_transfer(text, numeric, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_transfer(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_transfer(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.withdraw_transfer(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_roundup_settings(boolean, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.piggy_to_wallet() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.donate_piggy(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.apply_referral(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.process_split_send(text, numeric) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.lookup_wallet_by_code(text) FROM anon, public;
