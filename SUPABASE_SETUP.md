# Using School Admin with Supabase

Your Supabase REST API endpoint: `https://cfpzrrdnsmehqokjwmtp.supabase.co/rest/v1/`

## Step 1: Get Your Connection String

In Supabase Dashboard:
1. Go to **Settings → Database**
2. Copy the **Connection string** (PostgreSQL section)
3. Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

## Step 2: Update Backend .env

```bash
cd backend
```

Edit `.env`:
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@cfpzrrdnsmehqokjwmtp.supabase.co:5432/postgres
NODE_ENV=production
JWT_ACCESS_SECRET=your-32-char-secret
JWT_REFRESH_SECRET=your-32-char-secret
CORS_ORIGIN=https://your-frontend.vercel.app
PORT=4000
```

⚠️ Replace `[PASSWORD]` with your Supabase database password

## Step 3: Install PostgreSQL Driver

```bash
npm install pg
npm remove better-sqlite3
```

## Step 4: Update Database Configuration

Your new database config is ready at:
- `backend/src/config/db-postgres.js` (PostgreSQL version)

Update `backend/src/config/db.js` to use it:

```javascript
module.exports = require('./db-postgres');
```

Or rename the file:
```bash
# Backup old SQLite version
mv backend/src/config/db.js backend/src/config/db-sqlite.js

# Use PostgreSQL version
mv backend/src/config/db-postgres.js backend/src/config/db.js
```

## Step 5: Update Query Syntax

The new database module exports async functions instead of sync:

**Before (SQLite):**
```javascript
const db = require('../config/db');
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
```

**After (PostgreSQL):**
```javascript
const db = require('../config/db');
const user = await db.getOne('SELECT * FROM users WHERE id = $1', [userId]);
```

## Query Helper Methods

The new `db-postgres.js` provides async helpers:

```javascript
const db = require('../config/db');

// Get one row
const user = await db.getOne(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// Get all rows
const students = await db.getAll(
  'SELECT * FROM students WHERE grade_level = $1',
  [grade]
);

// Run query (INSERT/UPDATE/DELETE)
const rowsAffected = await db.run(
  'UPDATE students SET grade_level = $1 WHERE id = $2',
  [newGrade, studentId]
);

// Raw query
const result = await db.query(
  'INSERT INTO users (id, name, email) VALUES ($1, $2, $3)',
  [uuid, name, email]
);
```

## Key Differences from SQLite

| SQLite | PostgreSQL |
|--------|-----------|
| Sync functions | Async/await |
| `?` for params | `$1, $2, $3` (numbered) |
| `.get()` | `.getOne()` |
| `.all()` | `.getAll()` |
| No connection pool | Connection pooling built-in |
| No SSL | SSL required for production |

## Update All Backend Routes

You'll need to update all route files to use async/await with the new query syntax.

**Example update for `backend/src/routes/auth.routes.js`:**

```javascript
// Before (SQLite)
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

// After (PostgreSQL)
const user = await db.getOne('SELECT * FROM users WHERE email = $1', [email]);
```

## Test Connection

Create a test file:

```javascript
// test-db.js
const db = require('./backend/src/config/db');

(async () => {
  try {
    const result = await db.query('SELECT NOW()');
    console.log('✅ Connected to Supabase:', result.rows[0]);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
})();
```

Run:
```bash
node test-db.js
```

## Troubleshooting

### Connection refused
- Verify Supabase project is running (Status page)
- Check connection string is correct
- Verify IP address is allowed (Supabase → Settings → Security)

### Authentication failed
- Wrong password? Reset in Supabase Dashboard → Settings → Database
- Check DATABASE_URL doesn't have typos

### Queries failing
- Check parameter syntax: use `$1, $2` not `?`
- Ensure all queries are awaited
- Check SQL syntax in Supabase SQL Editor first

### Performance slow
- Check for N+1 queries
- Add indexes (already included in schema)
- Use connection pooling (already configured)

## Next Steps

1. **Update all route files** to use async/await and new query syntax
2. **Update seed.js** to use PostgreSQL syntax
3. **Test locally** with `npm run dev`
4. **Deploy backend** (Render, Railway, Fly.io)
5. **Deploy frontend** with correct API URL

## Supabase Dashboard

Access your database directly at:
- **URL**: https://cfpzrrdnsmehqokjwmtp.supabase.co
- **Table Editor**: View/edit data directly
- **SQL Editor**: Run queries
- **Logs**: Monitor queries and errors
- **Backups**: View automatic daily backups

## Connection Pooling

For serverless environments (Vercel, Netlify), use Supabase's **Connection Pooler**:

In Supabase Settings → Database → Connection string, switch to "Connection Pooler" mode:
```
postgresql://postgres:[PASSWORD]@cfpzrrdnsmehqokjwmtp.supabase.co:6543/postgres
```

This is included in `db-postgres.js` with a max of 20 connections.
