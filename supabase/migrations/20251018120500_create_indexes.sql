-- migration: create indexes for performance optimization
-- description: creates indexes on foreign key columns and frequently queried fields
-- tables affected: flashcards, generation_logs, generation_error_logs
-- notes: these indexes optimize queries filtering by user_id and flashcard_id

-- index on flashcards.user_id for faster user flashcard queries
-- rationale: most flashcard queries will filter by user_id to show user's cards
create index idx_flashcards_user_id on public.flashcards(user_id);

-- index on flashcards.due_date for faster review queue queries
-- rationale: queries for cards due for review will filter by due_date
create index idx_flashcards_due_date on public.flashcards(due_date);

-- composite index on flashcards for user's due cards
-- rationale: optimizes the common query pattern of getting a user's cards due for review
create index idx_flashcards_user_due on public.flashcards(user_id, due_date);

-- index on generation_logs.user_id for faster user log queries
-- rationale: analytics queries will filter logs by user_id
create index idx_generation_logs_user_id on public.generation_logs(user_id);

-- index on generation_logs.flashcard_id for faster flashcard history queries
-- rationale: may need to look up generation log for a specific flashcard
create index idx_generation_logs_flashcard_id on public.generation_logs(flashcard_id);

-- index on generation_error_logs.user_id for faster user error queries
-- rationale: diagnostic queries will filter error logs by user_id
create index idx_generation_error_logs_user_id on public.generation_error_logs(user_id);

-- index on generation_error_logs.created_at for time-based queries
-- rationale: monitoring queries often filter errors by time range
create index idx_generation_error_logs_created_at on public.generation_error_logs(created_at);

-- index on generation_error_logs.error_code for error analysis
-- rationale: helps identify patterns in specific error types
create index idx_generation_error_logs_error_code on public.generation_error_logs(error_code);

