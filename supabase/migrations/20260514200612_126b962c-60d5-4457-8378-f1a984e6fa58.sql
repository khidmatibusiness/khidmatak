
revoke execute on function public.confirm_booking_payment(uuid) from public, anon;
grant execute on function public.confirm_booking_payment(uuid) to authenticated;
