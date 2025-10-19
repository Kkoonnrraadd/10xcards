-- migration: create generation_logs table
-- description: creates table for logging user interactions with ai-generated flashcard suggestions
-- tables affected: generation_logs
-- notes: used for analytics and tracking ai suggestion acceptance rates

-- create generation_logs table to track ai flashcard generation interactions
create table public.generation_logs (
  -- unique identifier for each log entry
  id uuid primary key default gen_random_uuid(),
  
  -- reference to the user who reviewed the ai suggestion
  -- cascade delete ensures logs are removed when user is deleted
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- optional reference to the created flashcard if accepted
  -- null when user rejects the suggestion
  -- set null on delete preserves the log even if flashcard is later deleted
  flashcard_id uuid references public.flashcards(id) on delete set null,
  
  -- status of the review: accepted, accepted_with_edit, or rejected
  status generation_status not null,
  
  -- original front content suggested by ai
  -- stored as text to preserve full ai output for analytics
  original_front text not null,
  
  -- original back content suggested by ai
  -- stored as text to preserve full ai output for analytics
  original_back text not null,
  
  -- timestamp of when the log was created
  created_at timestamptz not null default now()
);

-- enable row level security on generation_logs table
-- this ensures users can only access their own generation logs
alter table public.generation_logs enable row level security;

-- policy: allow authenticated users to select their own generation logs
-- rationale: users may want to review their interaction history with ai suggestions
create policy "authenticated users can select their own generation logs"
  on public.generation_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- policy: allow authenticated users to insert their own generation logs
-- rationale: system needs to log user interactions with ai-generated flashcards
create policy "authenticated users can insert their own generation logs"
  on public.generation_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- policy: allow authenticated users to update their own generation logs
-- rationale: may need to update logs if flashcard association changes
create policy "authenticated users can update their own generation logs"
  on public.generation_logs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- policy: allow authenticated users to delete their own generation logs
-- rationale: users should be able to clear their interaction history
create policy "authenticated users can delete their own generation logs"
  on public.generation_logs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- add comment to table for documentation
comment on table public.generation_logs is 'logs user interactions with ai-generated flashcard suggestions for analytics';
comment on column public.generation_logs.flashcard_id is 'references created flashcard if accepted, null if rejected';
comment on column public.generation_logs.status is 'tracks whether suggestion was accepted, edited, or rejected';

