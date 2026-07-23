-- Backs the "Report post" button (previously a pure window.confirm/alert
-- stub with zero persistence — see PostOptionsMenu.tsx's old handleReport)
-- and a new "Report user" option on the other-profile "..." menu in
-- ProfileView.tsx (previously that menu only had "Block user").
--
-- Reports are moderation data, not a user-facing feature: there is no
-- admin-role system in this app yet, so intentionally there is no SELECT
-- policy for the authenticated/anon roles below. Reviewing reports means
-- querying this table directly via the Supabase SQL Editor (as postgres,
-- which bypasses RLS) — the same "check a table" manual-moderation
-- approach already used for the rest of this MVP. Only INSERT is exposed
-- to the client, matching the shape (not the specific columns) of
-- blocks' RLS.

create table public.reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references public.profiles(id) on delete cascade,
    target_type text not null check (target_type in ('post', 'user')),
    post_id uuid references public.posts(id) on delete cascade,
    reported_user_id uuid not null references public.profiles(id) on delete cascade,
    reason text,
    status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
    created_at timestamptz not null default now(),

    -- Reporting yourself (your own post or your own profile) is never a
    -- legitimate action — the UI never offers it either (Report post
    -- only renders for non-own posts, Report user only for other
    -- people's profiles), but this is cheap insurance at the DB layer.
    constraint reports_no_self_report check (reporter_id <> reported_user_id),

    -- post_id is required for a post report and forbidden for a user
    -- report, so the two report kinds can't be conflated.
    constraint reports_post_id_matches_target check (
        (target_type = 'post' and post_id is not null)
        or (target_type = 'user' and post_id is null)
    )
);

-- Reporting the same post (or the same user's profile) twice should be a
-- graceful no-op at the app layer, not a distinct row every time someone
-- double-taps — mirrors blocks' unique(blocker_id, blocked_id) plus
-- lib/blocks.ts's existing "23505 means already blocked, treat as
-- success" handling, which lib/reports.ts replicates for reports.
create unique index reports_unique_post_report
    on public.reports (reporter_id, post_id)
    where target_type = 'post';

create unique index reports_unique_user_report
    on public.reports (reporter_id, reported_user_id)
    where target_type = 'user' and post_id is null;

alter table public.reports enable row level security;

create policy "Users can create their own reports"
    on public.reports
    for insert
    with check (auth.uid() = reporter_id);

-- No SELECT/UPDATE/DELETE policy for authenticated/anon on purpose —
-- reports are write-only from the client. Nobody (not even the
-- reporter) can read reports back through the app; reviewing/managing
-- them happens via direct SQL access as the postgres role.
