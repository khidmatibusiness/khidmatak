## Problem

The `bookings` table has RLS enabled but no policies, so all inserts/selects/updates are denied. Your `rls_auto_enable` event trigger turns on RLS for every new table automatically — but policies were never added for `bookings`.

## Fix

Add RLS policies on `public.bookings` via a migration:

- **SELECT** — customer or pro on the booking can view it
  `customer_id = auth.uid() OR pro_id = auth.uid()`
- **INSERT** — authenticated user can create a booking only as themselves
  `customer_id = auth.uid()`
- **UPDATE** — customer or pro on the booking can update it (needed for status changes, review flags, cancellation paths that don't go through `cancel_booking` RPC)
  `customer_id = auth.uid() OR pro_id = auth.uid()`

No DELETE policy (bookings shouldn't be hard-deleted; cancellation flips status).

The existing `confirm_booking_payment` and `cancel_booking` functions are `SECURITY DEFINER`, so they already bypass RLS — no changes needed there.

## No code changes

The `book.$serviceId.tsx` insert is already correct (passes `customer_id: userId` matching `auth.uid()`). This is purely a database fix.
