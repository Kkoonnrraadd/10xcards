-- migration: create generation_error_logs table
-- description: creates table for logging errors during ai flashcard generation attempts
-- tables affected: generation_error_logs
-- notes: critical for monitoring and diagnosing ai generation issues

-- create generation_error_logs table to track ai generation failures
create table public.generation_error_logs (
  -- unique identifier for each error log entry
  id uuid primary key default gen_random_uuid(),
  
  -- reference to the user who experienced the error
  -- cascade delete ensures error logs are removed when user is deleted
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- ai model that was being used during the failed attempt
  -- stored as varchar for flexibility with different model names
  model varchar not null,
  
  -- hash of the source text to avoid storing full content
  -- useful for identifying duplicate errors without privacy concerns
  source_text_hash varchar not null,
  
  -- length of the source text in characters
  -- helps identify if text length was a factor in the error
  source_text_length integer not null,
  
  -- error code from the ai api or internal system
  -- limited to 100 characters for standardized error codes
  error_code varchar(100) not null,
  
  -- full error message for debugging purposes
  -- stored as text to capture complete error details
  error_message text not null,
  
  -- timestamp of when the error occurred
  created_at timestamptz not null default now()
);

-- enable row level security on generation_error_logs table
-- this ensures users can only access their own error logs
alter table public.generation_error_logs enable row level security;

-- policy: allow authenticated users to select their own error logs
-- rationale: users may want to see what errors occurred during their generation attempts
create policy "authenticated users can select their own error logs"
  on public.generation_error_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- policy: allow authenticated users to insert their own error logs
-- rationale: system needs to log errors that occur during ai generation
create policy "authenticated users can insert their own error logs"
  on public.generation_error_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- policy: allow authenticated users to update their own error logs
-- rationale: may need to update error logs with additional diagnostic information
create policy "authenticated users can update their own error logs"
  on public.generation_error_logs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- policy: allow authenticated users to delete their own error logs
-- rationale: users should be able to clear their error history
create policy "authenticated users can delete their own error logs"
  on public.generation_error_logs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- add comment to table for documentation
comment on table public.generation_error_logs is 'logs errors during ai flashcard generation for monitoring and diagnostics';
comment on column public.generation_error_logs.source_text_hash is 'hash of source text to identify duplicates without storing full content';
comment on column public.generation_error_logs.source_text_length is 'character count of source text, useful for identifying length-related errors';

