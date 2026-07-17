-- Enable Realtime for the notifications table so the client can subscribe to INSERTs
alter publication supabase_realtime add table public.notifications;
