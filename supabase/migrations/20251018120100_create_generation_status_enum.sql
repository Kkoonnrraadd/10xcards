-- migration: create generation_status enum type
-- description: creates custom enum type for tracking ai-generated flashcard review status
-- types affected: generation_status
-- notes: this enum will be used in the generation_logs table

-- create custom enum type for generation status
-- this tracks how users interact with ai-generated flashcard suggestions
create type generation_status as enum (
  'accepted',           -- user accepted the ai suggestion without changes
  'accepted_with_edit', -- user accepted but modified the ai suggestion
  'rejected'            -- user rejected the ai suggestion
);

-- add comment to type for documentation
comment on type generation_status is 'represents the review status of ai-generated flashcards';

