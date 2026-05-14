alter table public.services drop constraint if exists services_category_check;
alter table public.services add constraint services_category_check
  check (category = any (array['home','beauty','transport','medical','sports']));