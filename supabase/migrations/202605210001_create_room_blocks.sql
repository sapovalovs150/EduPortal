create table if not exists public.room_blocks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  type text not null check (type in ('repair', 'event')),
  title text not null,
  start_date date,
  end_date date,
  date date,
  start_time time,
  end_time time,
  created_at timestamptz not null default now(),
  constraint room_blocks_shape check (
    (
      type = 'repair'
      and start_date is not null
      and end_date is not null
      and date is null
      and start_time is null
      and end_time is null
      and start_date <= end_date
    )
    or
    (
      type = 'event'
      and date is not null
      and start_time is not null
      and end_time is not null
      and start_date is null
      and end_date is null
      and start_time < end_time
    )
  )
);

create index if not exists room_blocks_room_id_idx on public.room_blocks(room_id);
create index if not exists room_blocks_repair_range_idx on public.room_blocks(start_date, end_date) where type = 'repair';
create index if not exists room_blocks_event_date_idx on public.room_blocks(date) where type = 'event';

alter table public.room_blocks enable row level security;

drop policy if exists "room_blocks_select_public" on public.room_blocks;
create policy "room_blocks_select_public"
  on public.room_blocks
  for select
  to anon, authenticated
  using (true);

drop policy if exists "room_blocks_insert_public" on public.room_blocks;
create policy "room_blocks_insert_public"
  on public.room_blocks
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "room_blocks_delete_public" on public.room_blocks;
create policy "room_blocks_delete_public"
  on public.room_blocks
  for delete
  to anon, authenticated
  using (true);
