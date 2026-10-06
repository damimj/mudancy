-- Applied ONLY to the separate e2e test Supabase project (never production).
-- The Playwright global setup refuses to run unless the database it points
-- at contains the row ('test') below, so a misconfigured env var or CI
-- secret can never make the suite write to the real database.
create table if not exists e2e_environment (
  name text primary key
);

alter table e2e_environment enable row level security;

drop policy if exists "e2e_environment_select" on e2e_environment;
create policy "e2e_environment_select" on e2e_environment for select using (true);

insert into e2e_environment (name) values ('test') on conflict do nothing;
