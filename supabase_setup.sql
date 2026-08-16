-- ============================================================
-- Academy ERP — Auth & Security setup
-- Run this once in the Supabase SQL editor for your project.
-- Replaces the old "pick a role from a dropdown" fake login with
-- real Supabase Auth + Row Level Security.
-- ============================================================

-- 1. PROFILES TABLE (links an auth user to a role + optional student/staff link)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'parent' check (role in ('admin','teacher','parent')),
  linked_student_id bigint,   -- for parent accounts: which student row they can see
  linked_staff_id bigint,     -- for teacher accounts: which staff row they are
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Everyone can read their own profile (needed right after login to know their role)
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

-- Only admins can read/edit every profile
create policy "admins manage all profiles" on public.profiles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Auto-create a profile row whenever a new auth user signs up (defaults to 'parent';
-- an admin should promote real staff/admin accounts afterwards).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'parent');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. ROW LEVEL SECURITY on every ERP table
-- Pattern: admins/teachers get broad access, parents are scoped to
-- their own linked student. Adjust table/column names to match your
-- actual schema if they differ.
-- ============================================================

do $$
declare
  t text;
  admin_full_tables text[] := array[
    'staff','inventory','ledger','payroll','announcements','timetable',
    'assignments','admissions','alumni','leaves','curriculum',
    'virtual_class','audit_log','hostel_rooms','transport'
  ];
begin
  foreach t in array admin_full_tables loop
    execute format('alter table if exists public.%I enable row level security;', t);
    execute format('drop policy if exists "staff_full_access" on public.%I;', t);
    execute format($p$
      create policy "staff_full_access" on public.%I
      for all using (
        exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin','teacher'))
      );
    $p$, t);
  end loop;
end $$;

-- Students: admins/teachers see all; parents only see their own linked child
alter table if exists public.students enable row level security;

drop policy if exists "staff_full_access" on public.students;
create policy "staff_full_access" on public.students
  for all using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin','teacher'))
  );

drop policy if exists "parent_own_child" on public.students;
create policy "parent_own_child" on public.students
  for select using (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'parent' and pr.linked_student_id = students.id
    )
  );

-- Grades / attendance_log / behavior_log: same shape — admins/teachers full,
-- parents read-only rows belonging to their linked student.
do $$
declare
  t text;
  scoped_tables text[] := array['grades','attendance_log','behavior_log'];
begin
  foreach t in array scoped_tables loop
    execute format('alter table if exists public.%I enable row level security;', t);
    execute format('drop policy if exists "staff_full_access" on public.%I;', t);
    execute format($p$
      create policy "staff_full_access" on public.%I
      for all using (
        exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin','teacher'))
      );
    $p$, t);
  end loop;
end $$;

-- Note: attendance_log/behavior_log link via person_id, grades via student_id —
-- add matching "parent read own child" SELECT policies once you confirm those
-- foreign-key column names in your live schema.

-- ============================================================
-- 3. First admin account
-- After a user signs up through the app (Supabase Auth), run:
--   update public.profiles set role = 'admin' where id = '<their auth user uuid>';
-- ============================================================
