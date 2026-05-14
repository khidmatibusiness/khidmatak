alter table public.bookings
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_skipped boolean not null default false;