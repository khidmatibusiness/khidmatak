create or replace function public.redeem_referral(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_user uuid := auth.uid();
  v_referrer_id uuid;
  v_referrer_wallet uuid;
  v_new_wallet uuid;
  v_existing uuid;
  v_bonus numeric := 2;
begin
  if v_new_user is null then
    raise exception 'Not authenticated';
  end if;

  select w.user_id, w.id into v_referrer_id, v_referrer_wallet
  from wallets w where w.wallet_code = upper(p_code);

  if v_referrer_id is null then
    raise exception 'Referral code not found';
  end if;
  if v_referrer_id = v_new_user then
    raise exception 'You cannot refer yourself';
  end if;

  select id into v_existing from referrals where referred_id = v_new_user;
  if v_existing is not null then
    raise exception 'Referral already redeemed';
  end if;

  select id into v_new_wallet from wallets where user_id = v_new_user;
  if v_new_wallet is null then
    raise exception 'Your wallet was not found';
  end if;

  update wallets set balance = balance + v_bonus where id = v_referrer_wallet;
  update wallets set balance = balance + v_bonus where id = v_new_wallet;

  insert into referrals (referrer_id, referred_id, status)
  values (v_referrer_id, v_new_user, 'completed');

  insert into wallet_transactions (to_wallet_id, amount, type, note)
  values
    (v_referrer_wallet, v_bonus, 'referral_bonus', 'Referral bonus'),
    (v_new_wallet, v_bonus, 'referral_bonus', 'Welcome referral bonus');

  return jsonb_build_object('credited', v_bonus, 'referrer_id', v_referrer_id);
end;
$$;

revoke execute on function public.redeem_referral(text) from public, anon;
grant execute on function public.redeem_referral(text) to authenticated;