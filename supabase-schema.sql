-- ============================================================
-- SitePro — Supabase Database Schema
-- ============================================================
-- Copy this ENTIRE file and paste it into Supabase SQL Editor.
-- Click "Run". Done!
-- ============================================================

-- 1. COMPANY TABLE
-- All users belong to one shared company (for now).
-- When you go SaaS, each company gets its own row.
create table if not exists companies (
  id uuid default gen_random_uuid() primary key,
  name text not null default 'My Company',
  created_at timestamptz default now()
);

-- Insert a default company
insert into companies (id, name)
values ('00000000-0000-0000-0000-000000000001', 'My Company')
on conflict (id) do nothing;

-- 2. USER PROFILES
-- Extends Supabase Auth with app-specific data
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  company_id uuid references companies(id) default '00000000-0000-0000-0000-000000000001',
  full_name text,
  role text default 'member',
  created_at timestamptz default now()
);

-- 3. EMPLOYEES (the roster — people tracked, not necessarily app users)
create table if not exists employees (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) default '00000000-0000-0000-0000-000000000001',
  name text not null,
  role text default '',
  phone text default '',
  classification text default '',
  created_at timestamptz default now()
);

-- 4. CLASSIFICATIONS
create table if not exists classifications (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) default '00000000-0000-0000-0000-000000000001',
  name text not null,
  created_at timestamptz default now()
);

-- 5. PROJECTS
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) default '00000000-0000-0000-0000-000000000001',
  name text not null,
  client text default '',
  address text default '',
  color text default '#f5a623',
  created_at timestamptz default now()
);

-- 6. PHOTOS
create table if not exists photos (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  company_id uuid references companies(id) default '00000000-0000-0000-0000-000000000001',
  image_data text, -- base64 for now; move to Supabase Storage later
  name text default '',
  date date default current_date,
  note text default '',
  created_at timestamptz default now()
);

-- 7. HOURS
create table if not exists hours (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  company_id uuid references companies(id) default '00000000-0000-0000-0000-000000000001',
  employee_name text not null,
  classification text default '',
  hours numeric(6,2) not null,
  start_time text default '',
  end_time text default '',
  date date default current_date,
  notes text default '',
  created_at timestamptz default now()
);

-- 8. EXPENSES
create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  company_id uuid references companies(id) default '00000000-0000-0000-0000-000000000001',
  description text not null,
  amount numeric(12,2) not null,
  category text default 'Materials',
  vendor text default '',
  date date default current_date,
  scanned boolean default false,
  created_at timestamptz default now()
);

-- 9. TASKS
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  company_id uuid references companies(id) default '00000000-0000-0000-0000-000000000001',
  name text not null,
  assignee text default '',
  priority text default 'Medium',
  status text default 'Pending',
  date date default current_date,
  notes text default '',
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- This ensures users can only see their own company's data.
-- Critical for when you go multi-company SaaS.
-- ============================================================

alter table profiles enable row level security;
alter table employees enable row level security;
alter table classifications enable row level security;
alter table projects enable row level security;
alter table photos enable row level security;
alter table hours enable row level security;
alter table expenses enable row level security;
alter table tasks enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- For all company data tables: any authenticated user can CRUD
-- (Since everyone is in the same company for now, this is fine.
--  When you go SaaS, change these to check company_id match.)

-- EMPLOYEES
create policy "Authenticated users can view employees" on employees for select to authenticated using (true);
create policy "Authenticated users can insert employees" on employees for insert to authenticated with check (true);
create policy "Authenticated users can update employees" on employees for update to authenticated using (true);
create policy "Authenticated users can delete employees" on employees for delete to authenticated using (true);

-- CLASSIFICATIONS
create policy "Authenticated users can view classifications" on classifications for select to authenticated using (true);
create policy "Authenticated users can insert classifications" on classifications for insert to authenticated with check (true);
create policy "Authenticated users can delete classifications" on classifications for delete to authenticated using (true);

-- PROJECTS
create policy "Authenticated users can view projects" on projects for select to authenticated using (true);
create policy "Authenticated users can insert projects" on projects for insert to authenticated with check (true);
create policy "Authenticated users can update projects" on projects for update to authenticated using (true);
create policy "Authenticated users can delete projects" on projects for delete to authenticated using (true);

-- PHOTOS
create policy "Authenticated users can view photos" on photos for select to authenticated using (true);
create policy "Authenticated users can insert photos" on photos for insert to authenticated with check (true);
create policy "Authenticated users can delete photos" on photos for delete to authenticated using (true);

-- HOURS
create policy "Authenticated users can view hours" on hours for select to authenticated using (true);
create policy "Authenticated users can insert hours" on hours for insert to authenticated with check (true);
create policy "Authenticated users can delete hours" on hours for delete to authenticated using (true);

-- EXPENSES
create policy "Authenticated users can view expenses" on expenses for select to authenticated using (true);
create policy "Authenticated users can insert expenses" on expenses for insert to authenticated with check (true);
create policy "Authenticated users can delete expenses" on expenses for delete to authenticated using (true);

-- TASKS
create policy "Authenticated users can view tasks" on tasks for select to authenticated using (true);
create policy "Authenticated users can insert tasks" on tasks for insert to authenticated with check (true);
create policy "Authenticated users can update tasks" on tasks for update to authenticated using (true);
create policy "Authenticated users can delete tasks" on tasks for delete to authenticated using (true);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- When a user signs up, automatically create their profile row.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, company_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    '00000000-0000-0000-0000-000000000001'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index if not exists idx_projects_company on projects(company_id);
create index if not exists idx_hours_project on hours(project_id);
create index if not exists idx_hours_date on hours(date);
create index if not exists idx_expenses_project on expenses(project_id);
create index if not exists idx_tasks_project on tasks(project_id);
create index if not exists idx_photos_project on photos(project_id);
create index if not exists idx_employees_company on employees(company_id);

-- ============================================================
-- DONE! You should see "Success. No rows returned."
-- ============================================================
