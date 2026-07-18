-- Run this entire file once in Supabase -> SQL Editor.
-- It is safe to run again.
--
-- Prerequisite: collection-sharing.sql from the previous feature pack
-- has already been run, so public.collection_collaborators exists.

begin;

alter table public.notifications
  add column if not exists collection_id uuid null;

alter table public.notifications
  add column if not exists collection_role text null;

-- Add a predictable foreign-key name so the Supabase client can use
-- collections!notifications_collection_id_fkey in its select query.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_collection_id_fkey'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_collection_id_fkey
      foreign key (collection_id)
      references public.collections(id)
      on delete cascade;
  end if;
end;
$$;

-- Keep the role null for ordinary notifications and validate it for
-- collection-share notifications.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_collection_role_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_collection_role_check
      check (
        collection_role is null
        or collection_role in ('viewer', 'editor')
      );
  end if;
end;
$$;

-- Allow collection_share whether notifications.type is a normal
-- text column with a CHECK constraint or a PostgreSQL enum.
do $$
declare
  constraint_record record;
  type_data_type text;
  type_udt_schema text;
  type_udt_name text;
begin
  select data_type, udt_schema, udt_name
  into type_data_type, type_udt_schema, type_udt_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'notifications'
    and column_name = 'type';

  if type_data_type is null then
    raise exception 'public.notifications.type was not found.';
  end if;

  -- Remove any old CHECK that still lists only the original types.
  for constraint_record in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'notifications'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%type%'
  loop
    execute format(
      'alter table public.notifications drop constraint %I',
      constraint_record.conname
    );
  end loop;

  if type_data_type = 'USER-DEFINED' then
    execute format(
      'alter type %I.%I add value if not exists %L',
      type_udt_schema,
      type_udt_name,
      'collection_share'
    );
  else
    alter table public.notifications
      add constraint notifications_type_check
      check (
        type in (
          'like',
          'comment',
          'follow',
          'reply',
          'comment_like',
          'collection_share'
        )
      );
  end if;
end;
$$;

create index if not exists notifications_collection_id_idx
  on public.notifications(collection_id);

-- This trigger runs only when a collaborator row is newly inserted.
-- Changing an existing collaborator's role does not spam a second
-- notification. Removing and later re-adding someone creates a fresh
-- notification, which matches a new invitation.
create or replace function public.notify_collection_collaborator_added()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.invited_by is not null
     and new.user_id <> new.invited_by then
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      collection_id,
      collection_role
    )
    values (
      new.user_id,
      new.invited_by,
      'collection_share',
      new.collection_id,
      new.role
    );
  end if;

  return new;
end;
$$;

drop trigger if exists
  collection_collaborator_added_notification
  on public.collection_collaborators;

create trigger collection_collaborator_added_notification
after insert on public.collection_collaborators
for each row
execute function public.notify_collection_collaborator_added();

commit;
