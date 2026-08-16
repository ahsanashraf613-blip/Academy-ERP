-- ============================================================
-- Academy ERP – Full Schema with all new tables
-- Run once in Supabase SQL Editor
-- ============================================================

-- Extend profiles with avatar and settings
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists settings jsonb default '{"theme":"auto"}'::jsonb;

-- Students – add more fields
alter table public.students add column if not exists dob date;
alter table public.students add column if not exists parent_name text;
alter table public.students add column if not exists parent_phone text;
alter table public.students add column if not exists address text;
alter table public.students add column if not exists medical_info text;
alter table public.students add column if not exists enrollment_date date default now();
alter table public.students add column if not exists status text default 'Active' check (status in ('Active','Inactive','Graduated'));

-- Staff – more fields
alter table public.staff add column if not exists dob date;
alter table public.staff add column if not exists qualification text;
alter table public.staff add column if not exists joining_date date default now();
alter table public.staff add column if not exists contract_end date;

-- Fee Structures
create table if not exists public.fee_structures (
  id uuid primary key default gen_random_uuid(),
  grade text not null,
  tuition numeric,
  transport numeric,
  hostel numeric,
  other numeric,
  total numeric generated always as (coalesce(tuition,0)+coalesce(transport,0)+coalesce(hostel,0)+coalesce(other,0)) stored
);
alter table public.fee_structures enable row level security;
create policy "staff_full_access" on public.fee_structures for all using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher')));

-- Invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  student_id bigint references students(id) on delete cascade,
  amount numeric not null,
  due_date date not null,
  status text default 'Pending' check (status in ('Pending','Paid','Overdue')),
  issued_at timestamptz default now(),
  paid_at timestamptz
);
alter table public.invoices enable row level security;
create policy "staff_full_access" on public.invoices for all using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher')));
create policy "parent_own_child" on public.invoices for select using (
  exists (select 1 from profiles p join students s on s.id = invoices.student_id where p.id = auth.uid() and p.linked_student_id = s.id)
);

-- Events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  location text
);
alter table public.events enable row level security;
create policy "staff_full_access" on public.events for all using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher')));

-- Messages (Chat)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete cascade,
  receiver_id uuid references auth.users(id) on delete cascade,
  content text not null,
  sent_at timestamptz default now(),
  read_at timestamptz
);
alter table public.messages enable row level security;
create policy "users_can_read_their_messages" on public.messages for select using (auth.uid() in (sender_id, receiver_id));
create policy "users_can_insert_their_messages" on public.messages for insert with check (auth.uid() = sender_id);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  message text not null,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "users_can_read_own_notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "users_can_update_own_notifications" on public.notifications for update using (auth.uid() = user_id);

-- Assignments
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  due_date timestamptz,
  grade text,
  subject text,
  file_url text
);
alter table public.assignments enable row level security;
create policy "staff_full_access" on public.assignments for all using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher')));

-- Submissions
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments(id) on delete cascade,
  student_id bigint references students(id) on delete cascade,
  file_url text,
  submitted_at timestamptz default now(),
  marks numeric
);
alter table public.submissions enable row level security;
create policy "staff_full_access" on public.submissions for all using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher')));
create policy "parent_own_child" on public.submissions for select using (
  exists (select 1 from profiles p join students s on s.id = submissions.student_id where p.id = auth.uid() and p.linked_student_id = s.id)
);

-- Exam Schedules
create table if not exists public.exam_schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text,
  date date,
  start_time time,
  end_time time,
  grade text
);
alter table public.exam_schedules enable row level security;
create policy "staff_full_access" on public.exam_schedules for all using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher')));

-- Performance Reviews
create table if not exists public.performance_reviews (
  id uuid primary key default gen_random_uuid(),
  staff_id bigint references staff(id) on delete cascade,
  review_date date,
  rating integer check (rating between 1 and 5),
  comments text
);
alter table public.performance_reviews enable row level security;
create policy "staff_full_access" on public.performance_reviews for all using (exists (select 1 from profiles where id = auth.uid() and role in ('admin')));

-- Maintenance Requests (Hostel/Transport)
create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('Hostel','Transport')),
  item text,
  description text,
  status text default 'Pending' check (status in ('Pending','In Progress','Resolved')),
  reported_at timestamptz default now()
);
alter table public.maintenance_requests enable row level security;
create policy "staff_full_access" on public.maintenance_requests for all using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher')));

-- Alumni Map (we'll use address->lat/lng via geocoding later)
alter table public.alumni add column if not exists latitude numeric;
alter table public.alumni add column if not exists longitude numeric;

-- Donations
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  alumni_id bigint references alumni(id) on delete cascade,
  amount numeric,
  date date default now(),
  campaign text
);
alter table public.donations enable row level security;
create policy "staff_full_access" on public.donations for all using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher')));

-- Behavior rewards
alter table public.behavior_log add column if not exists reward boolean default false;

-- Enable Realtime for messages & notifications
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;
