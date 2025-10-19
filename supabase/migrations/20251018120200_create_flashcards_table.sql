-- migration: create flashcards table
-- description: creates the flashcards table for storing user-created flashcards with fsrs algorithm support
-- tables affected: flashcards
-- notes: includes columns for fsrs (free spaced repetition scheduler) algorithm

-- create flashcards table to store user flashcards
create table public.flashcards (
  -- unique identifier for each flashcard
  id uuid primary key default gen_random_uuid(),
  
  -- reference to the user who owns this flashcard
  -- cascade delete ensures all flashcards are removed when user is deleted
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- front side of the flashcard (question/prompt)
  -- limited to 200 characters
  front varchar(200) not null,
  
  -- back side of the flashcard (answer)
  -- limited to 500 characters
  back varchar(500) not null,
  
  -- next scheduled review date for this flashcard
  -- defaults to now() so new cards are immediately available for review
  due_date timestamptz not null default now(),
  
  -- fsrs algorithm parameter: represents memory stability
  -- higher values mean the memory is more stable
  stability real,
  
  -- fsrs algorithm parameter: represents card difficulty
  -- higher values mean the card is more difficult for the user
  difficulty real,
  
  -- history of all reviews for this flashcard
  -- stores array of review objects with dates, ratings, etc.
  -- jsonb format allows flexible querying and indexing
  review_history jsonb,
  
  -- timestamp of when the flashcard was created
  created_at timestamptz not null default now(),
  
  -- timestamp of when the flashcard was last updated
  -- this will be automatically updated via trigger
  updated_at timestamptz not null default now()
);

-- enable row level security on flashcards table
-- this ensures users can only access their own flashcards
alter table public.flashcards enable row level security;

-- policy: allow authenticated users to select their own flashcards
-- rationale: users need to read their flashcards for study sessions
create policy "authenticated users can select their own flashcards"
  on public.flashcards
  for select
  to authenticated
  using (auth.uid() = user_id);

-- policy: allow authenticated users to insert their own flashcards
-- rationale: users need to create new flashcards
create policy "authenticated users can insert their own flashcards"
  on public.flashcards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- policy: allow authenticated users to update their own flashcards
-- rationale: users need to modify flashcard content and update review data
create policy "authenticated users can update their own flashcards"
  on public.flashcards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- policy: allow authenticated users to delete their own flashcards
-- rationale: users should be able to remove flashcards they no longer want
create policy "authenticated users can delete their own flashcards"
  on public.flashcards
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- add comment to table for documentation
comment on table public.flashcards is 'stores user flashcards with fsrs algorithm support for spaced repetition';
comment on column public.flashcards.stability is 'fsrs parameter: memory stability (higher = more stable)';
comment on column public.flashcards.difficulty is 'fsrs parameter: card difficulty (higher = more difficult)';
comment on column public.flashcards.review_history is 'jsonb array of review records with dates, ratings, and outcomes';

