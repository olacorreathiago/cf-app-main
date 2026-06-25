-- Allow staff (owner/partner/manager/coach) to insert bookings for any user in their box.
-- Required for the "add athlete to class" feature in the manager UI.
create policy "bookings_insert_staff"
  on public.bookings for insert
  with check (
    public.has_box_role(
      (select box_id from public.classes where id = class_id),
      'owner', 'partner', 'manager', 'coach'
    )
  );
