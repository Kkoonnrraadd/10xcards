-- migration: create trigger for automatic updated_at timestamp
-- description: creates function and triggers to automatically update updated_at column
-- tables affected: users, flashcards
-- notes: ensures updated_at is always current without manual intervention

-- create function to update the updated_at timestamp
-- this function will be called by triggers before any update operation
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  -- set the updated_at column to the current timestamp
  new.updated_at = now();
  return new;
end;
$$;

-- add comment to function for documentation
comment on function public.handle_updated_at() is 'automatically updates the updated_at column to current timestamp on row updates';

-- create trigger on users table
-- rationale: automatically maintain updated_at timestamp when profile is modified
create trigger set_updated_at
  before update on public.users
  for each row
  execute function public.handle_updated_at();

-- create trigger on flashcards table
-- rationale: automatically maintain updated_at timestamp when flashcard is modified
create trigger set_updated_at
  before update on public.flashcards
  for each row
  execute function public.handle_updated_at();

