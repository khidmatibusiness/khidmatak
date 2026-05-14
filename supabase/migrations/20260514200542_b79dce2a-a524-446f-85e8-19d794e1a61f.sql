
create or replace function public.confirm_booking_payment(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_customer_wallet uuid;
  v_pro_wallet uuid;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;
  if v_booking.customer_id <> auth.uid() then
    raise exception 'Not allowed';
  end if;
  if v_booking.payment_method <> 'wallet' then
    return;
  end if;

  select id into v_customer_wallet from wallets where user_id = v_booking.customer_id;
  select id into v_pro_wallet from wallets where user_id = v_booking.pro_id;

  if v_customer_wallet is null or v_pro_wallet is null then
    raise exception 'Wallet not found';
  end if;

  perform process_booking_payment(p_booking_id, v_customer_wallet, v_pro_wallet, v_booking.total_amount);
end;
$$;
