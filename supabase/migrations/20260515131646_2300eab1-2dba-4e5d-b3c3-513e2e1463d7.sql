CREATE POLICY "Bookings select own"
ON public.bookings FOR SELECT TO authenticated
USING (customer_id = auth.uid() OR pro_id = auth.uid());

CREATE POLICY "Bookings insert own customer"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Bookings update participants"
ON public.bookings FOR UPDATE TO authenticated
USING (customer_id = auth.uid() OR pro_id = auth.uid())
WITH CHECK (customer_id = auth.uid() OR pro_id = auth.uid());