# School Admin — Management System

A fast, secure admin console for running a school: students, staff, attendance,
grades, fees, and timetable — all behind role-based authentication.

```
school-admin/
├── backend/    Node.js + Express API (SQLite)
└── frontend/   React + Vite admin console
```

## Why it's fast

- **SQLite via `better-sqlite3`** — synchronous, in-process, no network round trip
  to a separate database server. Indexed on the columns admin screens filter by
  (attendance date, grades by student, fees by student).
- **Vite** for the frontend — near-instant dev server start and a small, code-split
  production bundle (built output is ~60 KB gzipped for the JS).
- Paginated list endpoints (students) so the UI never has to load the whole table.

## Why it's secure

- **Passwords**: hashed with bcrypt (cost factor 12), never stored or logged in plain text.
- **Sessions**: short-lived JWT access tokens (15 min) kept in memory in the browser
  (never `localStorage`, to limit XSS blast radius) + a rotating refresh token stored
  in an `httpOnly`, `SameSite=Strict` cookie. Refresh tokens are hashed before being
  stored, and are revoked on logout or password change.
- **Brute-force protection**: login attempts are rate-limited, and accounts lock for
  15 minutes after 5 consecutive failures.
- **Input validation**: every write endpoint validates and sanitizes input with
  `express-validator` before it touches the database.
- **SQL injection protection**: all queries use parameterized statements — no string
  concatenation of user input into SQL, anywhere.
- **Role-based access control**: four roles (`admin`, `registrar`, `teacher`,
  `accountant`), enforced server-side on every mutating route — the frontend hiding
  a button is a convenience, not the security boundary.
- **Security headers**: `helmet` sets a locked-down CSP, HSTS, and disables things
  like MIME-sniffing.
- **Rate limiting**: general API rate limit plus a much stricter one on `/auth/login`.
- **Audit log**: every create/update/delete and every login attempt is recorded with
  the acting user, action, entity, and IP address.
- **No secrets in source**: JWT secrets, DB path, and CORS origin all come from
  environment variables — `.env` is gitignored, and the server refuses to start if
  the JWT secrets are missing or too short.

## Features

### Core Functionality
- 👥 **Student Management**: Enroll, edit, and manage student records with guardian information
- 👨‍💼 **Staff Management**: Manage staff members with roles and departments
- 📋 **Attendance Tracking**: Mark daily attendance with multiple status options
- 📊 **Grade Recording**: Record and manage student grades by subject and term
- 💰 **Fee Management**: Create invoices, track payments, and manage outstanding fees
- 📅 **Timetable**: Build and manage class schedules by grade and section

### Admin Features
- 🔐 **User Management** (Admin only): Create and manage user accounts, assign roles, toggle active status
- 📝 **Audit Log** (Admin only): View complete audit trail of all system actions, logins, and data changes
- ⚙️ **Settings**: Change password, manage account preferences
- 🔑 **Role-Based Access Control**: Four roles with specific permissions (admin, registrar, teacher, accountant)

### UI/UX Enhancements
- ✅ **Edit/Delete Operations**: Full CRUD support for students, staff, and grades
- ⚠️ **Confirmation Dialogs**: Safe deletion with confirmation prompts
- 🎯 **Error Boundaries**: Graceful error handling to prevent app crashes
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🎨 **Clean Interface**: Minimal, professional design with Tailwind CSS

### Security
- 🔒 Password hashing with bcrypt (cost factor 12)
- 🔐 JWT-based authentication with rotating refresh tokens
- 🚫 Brute-force protection with account lockout
- 📋 Complete audit logging of all system actions
- ✓ Input validation and SQL injection prevention
- 🛡️ Security headers with Helmet
- 🔌 Rate limiting on API endpoints

## Documentation

- **[API.md](./API.md)** — Complete API reference with all endpoints, request/response examples, and error codes
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Deployment guides for Render, Railway, Fly.io, Docker, and traditional VPS
- **[TESTING.md](./TESTING.md)** — Testing strategies including smoke tests, security testing, and performance benchmarks

## Getting started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- Generate strong secrets: `openssl rand -hex 32` (run twice, once for each JWT secret)
- Set `SEED_ADMIN_PASSWORD` to something you'll actually use (12+ characters)
- Adjust `CORS_ORIGIN` if your frontend runs somewhere other than `http://localhost:5173`

Then:

```bash
npm run seed    # creates your first admin account
npm run dev     # starts the API on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev     # starts the console on http://localhost:5173
```

Log in with the email/password you set as `SEED_ADMIN_PASSWORD`, then **change that
password immediately** from your own account (Settings → Change Password).

## Roles

| Role         | Can do |
|--------------|--------|
| `admin`      | Everything: manage users, view audit logs, delete any records |
| `registrar`  | Enroll/edit students, mark attendance, manage timetable |
| `teacher`    | Mark attendance, record and edit grades |
| `accountant` | Create invoices, record payments, view fees |

Create additional user accounts through the admin **Users** page once logged in.

## Docker Deployment

The easiest way to get started in production:

```bash
# Set up environment
cp .env.example .env
# Edit .env with your production settings

# Start with Docker Compose
docker-compose up -d

# Seed the database (first time only)
docker-compose exec api npm run seed

# Application runs on:
# - API: http://localhost:4000
# - Web: http://localhost:80
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for more platform-specific guides.

## Project Structure

```
school-admin/
├── backend/
│   ├── src/
│   │   ├── config/       # Database schema and seeding
│   │   ├── middleware/   # Auth, security, validation
│   │   ├── routes/       # API endpoints
│   │   ├── utils/        # Audit logging
│   │   └── server.js     # Express app
│   ├── tests/            # Smoke tests
│   ├── Dockerfile        # Container image
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── context/      # Authentication context
│   │   ├── api/          # API client
│   │   ├── App.jsx       # Main app routes
│   │   └── main.jsx      # Entry point
│   ├── Dockerfile        # Container image
│   ├── nginx.conf        # Web server config
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── .env.example
│
├── docker-compose.yml    # Multi-container orchestration
├── .dockerignore
├── .gitignore
├── API.md               # API documentation
├── DEPLOYMENT.md        # Deployment guide
├── TESTING.md           # Testing guide
└── README.md            # This file
```

## What's complete

✅ Full CRUD operations for all entities (students, staff, grades, fees, attendance, timetable)
✅ Role-based access control (admin, registrar, teacher, accountant)
✅ User management and audit logging (admin-only)
✅ Settings page with password change
✅ Confirmation dialogs for destructive actions
✅ Error boundaries for robust error handling
✅ API documentation with full endpoint reference
✅ Docker setup for containerized deployment
✅ Deployment guides for multiple platforms
✅ Smoke tests and testing documentation
✅ Security hardening (authentication, input validation, rate limiting, audit logging)

## Deploying for real use

This ships as source, not a hosted app — you (or your host) need to run it:

1. **Backend**: deploy to any Node host (Render, Railway, Fly.io, a VPS, etc.).
   Put the SQLite file on persistent storage/disk. Set `NODE_ENV=production` and
   real environment variables — never reuse the example secrets.
2. **Frontend**: `npm run build` produces a static `dist/` folder — deploy it to
   any static host (Vercel, Netlify, Cloudflare Pages, or served by the same
   Node process). Set `VITE_API_URL` to your backend's public URL at build time.
3. **HTTPS is required in production** — cookies are marked `secure` when
   `NODE_ENV=production`, so the site must be served over HTTPS or refresh tokens
   won't be sent.
4. Put the backend behind a reverse proxy (nginx/Caddy) or your host's built-in
   TLS termination.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step guides for specific platforms.

## What to build next

If this grows, the natural next additions are:
- 📧 Email notifications for overdue fees and attendance alerts
- 📊 Advanced reporting and CSV/PDF export
- 🖼️ Student photos and document storage
- 👨‍👩‍👧 Parent portal (read-only access to their child's records)
- 📞 SMS notifications and communication features
- 🔄 Backup and restore utilities
- 🌐 Multi-language support
