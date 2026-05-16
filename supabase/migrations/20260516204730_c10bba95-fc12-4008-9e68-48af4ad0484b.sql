
-- 1. Reviews: stop exposing customer_id/pro_id to anon/authenticated wildcards.
DROP POLICY IF EXISTS "Reviews select public columns via view" ON public.reviews;

-- 2. Bookings: prevent participants from mutating financial/identity columns.
CREATE OR REPLACE FUNCTION public.prevent_booking_field_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow SECURITY DEFINER RPCs to bypass via session role check is not portable.
  -- Instead always block these columns from changing post-insert.
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.pro_id IS DISTINCT FROM OLD.pro_id
     OR NEW.service_id IS DISTINCT FROM OLD.service_id
     OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
     OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method THEN
    RAISE EXCEPTION 'Cannot modify protected booking fields (identity, financial, or payment_method)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_prevent_field_tampering ON public.bookings;
CREATE TRIGGER bookings_prevent_field_tampering
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.prevent_booking_field_tampering();

-- 3. Lock down SECURITY DEFINER functions:
--    a) Internal/trigger-only functions: revoke from everyone.
REVOKE EXECUTE ON FUNCTION public.generate_wallet_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_wallet_for_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_commission_amount() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_wallet_balance(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_booking_payment(uuid, uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;

--    b) User-action RPCs: only authenticated users may call.
REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_booking_payment(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_booking(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_roundup_settings(boolean, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_transfer(text, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_transfer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_transfer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.withdraw_transfer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.piggy_to_wallet() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.donate_piggy(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apply_referral(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_split_send(text, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lookup_wallet_by_code(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_booking_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_roundup_settings(boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_transfer(text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_transfer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_transfer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_transfer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.piggy_to_wallet() TO authenticated;
GRANT EXECUTE ON FUNCTION public.donate_piggy(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_referral(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_split_send(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_wallet_by_code(text) TO authenticated;
