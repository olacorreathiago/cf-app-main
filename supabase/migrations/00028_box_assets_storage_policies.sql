-- Add missing UPDATE and DELETE policies for box-assets storage bucket
drop policy if exists "box_assets_staff_update" on storage.objects;
drop policy if exists "box_assets_staff_delete" on storage.objects;

create policy "box_assets_staff_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'box-assets'
    and public.has_box_role((storage.foldername(name))[1]::uuid, 'owner', 'partner', 'manager')
  )
  with check (
    bucket_id = 'box-assets'
    and public.has_box_role((storage.foldername(name))[1]::uuid, 'owner', 'partner', 'manager')
  );

create policy "box_assets_staff_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'box-assets'
    and public.has_box_role((storage.foldername(name))[1]::uuid, 'owner', 'partner', 'manager')
  );
