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
