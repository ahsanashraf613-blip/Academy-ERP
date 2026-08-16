# Academy ERP — fixes applied

## ⚠️ Do this first (required)
The old login was fake (a dropdown, no password) and every table was reachable
by anyone with the public anon key. This rewrite uses real Supabase Auth, but
**you must run `supabase_setup.sql` in your Supabase project's SQL editor**
before it will work correctly — it creates the `profiles` table and Row Level
Security policies that actually enforce roles server-side.

After that:
1. Sign up through the app once (creates an `auth.users` row + a `profiles`
   row defaulted to `role = 'parent'`).
2. In the Supabase table editor, open `profiles` and change that row's `role`
   to `admin` (or `teacher`) as needed. Repeat for each real user.
3. For parent accounts, set `linked_student_id` to the correct row in
   `students` so they only ever see their own child's data.

## Security
- Replaced the fake role-dropdown login with real `supabase.auth.signUp` /
  `signInWithPassword`, session persistence, and sign-out.
- Role now comes from the `profiles` table (server-enforced via RLS), not a
  client-side variable — the old version let anyone declare themselves Admin.
- Added `esc()` and used it everywhere user-entered data is written into
  `innerHTML`, closing the XSS holes in student/staff/ledger/etc. rendering.

## Bugs fixed
- Admissions kanban column markup (`<h4>` was closed with `</div>`, breaking
  the column layout and pushing cards outside their column).
- Report cards showed a hardcoded `"A"` for every subject regardless of
  marks — now computed from actual marks (`letterGrade()`).
- Print flow referenced a `#printAreaReceipt` element that never existed in
  the HTML — removed the dead reference, print now reliably uses `#printArea`.
- Dashboard bar-chart CSS existed but was never used — Finance dashboard now
  renders a real income-vs-expense bar chart.

## Features added
- **Payroll module** — was a placeholder string, now lists staff with salary
  and a "Run Payroll" action that logs real ledger expenses.
- Edit/delete added for Students, Staff, Inventory, Alumni; add for
  Timetable, Announcements, Behavior Log; Leave requests can now be
  approved *or* rejected (previously approve-only).
- Finance page can log Income as well as Expense, and its filter tabs
  (already styled in the old CSS but unused) now actually filter the table.
- Client-side search + pagination on the Students list.
- Required-field validation on every form (was previously silent no-ops).
- Urdu translations expanded to cover the whole nav and RTL layout is now
  applied (`dir="rtl"`) when Urdu is selected.

## Design
- New token system (color, type, spacing) instead of the generic
  indigo/Segoe-UI admin-template look — Sora for headings, Inter for body,
  JetBrains Mono for numeric/financial data.
- Emoji icons replaced with a consistent inline SVG icon set across nav and
  stat cards.
- Mobile-responsive sidebar (hamburger + slide-over + overlay) — the old
  fixed 250px sidebar had no mobile behavior at all.
- Designed empty states (icon + message) instead of bare "No data" text.
- Dark mode now covers the login screen and badges, which previously stayed
  hardcoded light-mode colors.
- Visible focus rings on every interactive element for keyboard users.

## Known follow-ups worth doing next
- The parent-scoped RLS policies for `grades`, `attendance_log`, and
  `behavior_log` need their foreign-key column names confirmed against your
  live schema before enabling — see the comment near the bottom of the SQL
  file.
- Password reset flow isn't wired up yet (Supabase supports it via
  `resetPasswordForEmail`, just needs a UI).
- Consider adding pagination to Staff/Ledger the same way Students now has it
  once those lists grow.
