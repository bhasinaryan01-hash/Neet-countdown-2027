create table if not exists public.student_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.student_progress enable row level security;
drop policy if exists "Students can read their own progress" on public.student_progress;
create policy "Students can read their own progress" on public.student_progress for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Students can create their own progress" on public.student_progress;
create policy "Students can create their own progress" on public.student_progress for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Students can update their own progress" on public.student_progress;
create policy "Students can update their own progress" on public.student_progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public student study room. Only authenticated users can read or post.
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Student' check (char_length(display_name) between 1 and 32),
  content text not null check (char_length(trim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
drop policy if exists "Signed-in students can read chat" on public.chat_messages;
create policy "Signed-in students can read chat" on public.chat_messages for select to authenticated using (true);
drop policy if exists "Students can post as themselves" on public.chat_messages;
create policy "Students can post as themselves" on public.chat_messages for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Students can delete own chat messages" on public.chat_messages;
create policy "Students can delete own chat messages" on public.chat_messages for delete to authenticated using (auth.uid() = user_id);

-- Simple per-user rate limit to reduce spam (one message every 3 seconds).
create or replace function public.limit_student_chat_rate()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if exists (
    select 1 from public.chat_messages
    where user_id = new.user_id
      and created_at > now() - interval '3 seconds'
  ) then
    raise exception 'Please wait a few seconds before sending another message.';
  end if;
  return new;
end;
$$;
drop trigger if exists student_chat_rate_limit on public.chat_messages;
create trigger student_chat_rate_limit before insert on public.chat_messages
for each row execute function public.limit_student_chat_rate();

create table if not exists public.chat_reports (
  id bigint generated always as identity primary key,
  message_id bigint not null references public.chat_messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 1 and 300),
  created_at timestamptz not null default now(),
  unique(message_id, reporter_id)
);
alter table public.chat_reports enable row level security;
drop policy if exists "Students can report chat messages" on public.chat_reports;
create policy "Students can report chat messages" on public.chat_reports for insert to authenticated with check (auth.uid() = reporter_id);
drop policy if exists "Students can view own reports" on public.chat_reports;
create policy "Students can view own reports" on public.chat_reports for select to authenticated using (auth.uid() = reporter_id);

-- Enable Supabase Realtime for new chat messages.
do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
