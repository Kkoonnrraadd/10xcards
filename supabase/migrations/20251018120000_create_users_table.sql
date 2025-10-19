-- migration: create users table
-- description: creates the public.users table with 1-to-1 relationship to auth.users
-- tables affected: users
-- notes: this table stores public profile data for users

-- create users table to store public profile information
-- this has a 1-to-1 relationship with auth.users from supabase
create table public.users (
  -- primary key that references the supabase auth.users table
  -- using cascade delete ensures that when a user is deleted from auth,
  -- their profile is automatically removed
  id uuid primary key references auth.users(id) on delete cascade,
  
  -- timestamp of when the profile was created
  created_at timestamptz not null default now(),
  
  -- timestamp of when the profile was last updated
  -- this will be automatically updated via trigger
  updated_at timestamptz not null default now()
);

-- enable row level security on users table
-- this ensures users can only access their own profile data
alter table public.users enable row level security;

-- policy: allow authenticated users to select their own profile
-- rationale: users need to read their own profile information
create policy "authenticated users can select their own profile"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

-- policy: allow authenticated users to insert their own profile
-- rationale: users need to create their profile on first login
create policy "authenticated users can insert their own profile"
  on public.users
  for insert
  to authenticated
  with check (auth.uid() = id);

-- policy: allow authenticated users to update their own profile
-- rationale: users need to modify their profile information
create policy "authenticated users can update their own profile"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- policy: allow authenticated users to delete their own profile
-- rationale: users should be able to delete their profile if needed
create policy "authenticated users can delete their own profile"
  on public.users
  for delete
  to authenticated
  using (auth.uid() = id);

-- add comment to table for documentation
comment on table public.users is 'stores public profile data for users with 1-to-1 relationship to auth.users';

