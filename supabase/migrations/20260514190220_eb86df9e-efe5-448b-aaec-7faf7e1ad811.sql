revoke execute on function public.process_split_send(text, numeric) from anon, public;
revoke execute on function public.lookup_wallet_by_code(text) from anon, public;
grant execute on function public.process_split_send(text, numeric) to authenticated;
grant execute on function public.lookup_wallet_by_code(text) to authenticated;