-- Turns on Supabase Realtime (Postgres Changes) for the notification
-- bell and the comments sheet.
--
-- Before this, the project's supabase_realtime publication had zero
-- tables in it, so nothing in the app updated live: the bell only
-- reflected whatever was unread when the feed page mounted, and the
-- comments sheet only reflected whatever existed when it was opened.
--
-- Safety: both tables already have RLS enabled with policies that are
-- safe to expose over Realtime as-is —
--   notifications: SELECT restricted to `auth.uid() = recipient_id`,
--     so a client only ever receives INSERT events for their own rows.
--   comments: SELECT is `true` (public), matching what getComments()
--     already returns today — no new data is exposed.
-- Verified live against production before and after this migration.

alter publication supabase_realtime add table public.notifications, public.comments;

-- REPLICA IDENTITY DEFAULT only includes primary-key columns in the
-- "old" row for UPDATE/DELETE. The comments sheet subscribes with a
-- `post_id=eq.<postId>` filter, and Realtime evaluates that filter
-- against the old row for DELETE events — without FULL identity,
-- post_id isn't present on delete, so the filter never matches and
-- deletes never reach subscribed clients. Confirmed empirically: a
-- live DELETE was silently dropped before this line, and started
-- arriving correctly immediately after.
alter table public.comments replica identity full;
