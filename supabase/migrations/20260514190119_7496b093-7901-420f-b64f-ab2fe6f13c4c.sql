create or replace function public.process_split_send(p_recipient_code text, p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_wallet_id uuid;
  v_sender_balance numeric;
  v_recipient_wallet_id uuid;
  v_recipient_user_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select id, balance into v_sender_wallet_id, v_sender_balance
  from wallets where user_id = auth.uid();

  if v_sender_wallet_id is null then
    raise exception 'Sender wallet not found';
  end if;

  select id, user_id into v_recipient_wallet_id, v_recipient_user_id
  from wallets where wallet_code = upper(p_recipient_code);

  if v_recipient_wallet_id is null then
    raise exception 'Recipient code not found';
  end if;

  if v_recipient_wallet_id = v_sender_wallet_id then
    raise exception 'Cannot send to your own wallet';
  end if;

  if v_sender_balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  update wallets set balance = balance - p_amount where id = v_sender_wallet_id;
  update wallets set balance = balance + p_amount where id = v_recipient_wallet_id;

  insert into wallet_transactions (from_wallet_id, to_wallet_id, amount, type, note)
  values (v_sender_wallet_id, v_recipient_wallet_id, p_amount, 'split_send', 'Send by code');

  return jsonb_build_object('recipient_user_id', v_recipient_user_id, 'amount', p_amount);
end;
$$;

create or replace function public.lookup_wallet_by_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_full_name text;
begin
  select w.user_id into v_user_id from wallets w where w.wallet_code = upper(p_code);
  if v_user_id is null then
    return null;
  end if;
  select full_name into v_full_name from users where id = v_user_id;
  return jsonb_build_object('user_id', v_user_id, 'full_name', coalesce(v_full_name, 'Khidmati user'));
end;
$$;