create or replace function public.cancel_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_customer_wallet uuid;
  v_pro_wallet uuid;
  v_platform_wallet uuid;
  v_commission numeric;
  v_pro_amount numeric;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;
  if v_booking.customer_id <> auth.uid() then
    raise exception 'Not allowed';
  end if;
  if v_booking.status not in ('pending') then
    raise exception 'Only pending bookings can be cancelled';
  end if;

  update bookings set status = 'cancelled' where id = p_booking_id;

  if v_booking.payment_method = 'wallet' then
    select id into v_customer_wallet from wallets where user_id = v_booking.customer_id;
    select id into v_pro_wallet from wallets where user_id = v_booking.pro_id;
    select id into v_platform_wallet from wallets
      where user_id = '00000000-0000-0000-0000-000000000001';

    v_commission := v_booking.total_amount * 0.15;
    v_pro_amount := v_booking.total_amount * 0.85;

    if v_customer_wallet is not null then
      update wallets set balance = balance + v_booking.total_amount where id = v_customer_wallet;
    end if;
    if v_pro_wallet is not null then
      update wallets set balance = balance - v_pro_amount where id = v_pro_wallet;
    end if;
    if v_platform_wallet is not null then
      update wallets set balance = balance - v_commission where id = v_platform_wallet;
    end if;

    if v_pro_wallet is not null and v_customer_wallet is not null then
      insert into wallet_transactions (from_wallet_id, to_wallet_id, amount, type, reference_id, note)
      values (v_pro_wallet, v_customer_wallet, v_pro_amount, 'refund', p_booking_id, 'Booking cancelled');
    end if;
    if v_platform_wallet is not null and v_customer_wallet is not null then
      insert into wallet_transactions (from_wallet_id, to_wallet_id, amount, type, reference_id, note)
      values (v_platform_wallet, v_customer_wallet, v_commission, 'refund', p_booking_id, 'Commission refunded');
    end if;
  end if;

  return jsonb_build_object('status', 'cancelled', 'refunded', v_booking.payment_method = 'wallet');
end;
$$;

revoke execute on function public.cancel_booking(uuid) from anon, public;
grant execute on function public.cancel_booking(uuid) to authenticated;