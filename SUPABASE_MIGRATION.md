# Supabase Migration Guide

This guide walks you through migrating the School Admin application from SQLite to **Supabase** (managed PostgreSQL).

## Why Supabase?

- ✅ **Managed PostgreSQL** - No database server to maintain
- ✅ **Real-time capabilities** - Live updates with subscriptions
- ✅ **Built-in authentication** - Optional: use Supabase Auth instead of custom JWT
- ✅ **Row Level Security (RLS)** - Fine-grained access control at the database level
- ✅ **Automatic backups** - Daily backups included
- ✅ **Scalable** - Handles growth without DevOps overhead
- ✅ **Free tier available** - Start with no credit card

## Step 1: Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project:
   - Click "New Project"
   - Choose organization
   - Set database password (save it!)
   - Select region closest to you
   - Wait for database to initialize (~2 min)

3. Get your connection credentials:
   - Go to Project Settings → Database
   - Copy the **Connection string** (PostgreSQL)
   - Format: `postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres`

## Step 2: Create Database Schema

1. Open **Supabase SQL Editor** (in your project dashboard)
2. Copy contents of [supabase.sql](./supabase.sql)
3. Paste into SQL Editor and click "Run"
4. Create triggers: paste contents of [supabase-triggers.sql](./supabase-triggers.sql) and run

Your schema is now ready!

## Step 3: Update Backend Configuration

### Option A: Using postgres Client Library (Recommended)

Install the PostgreSQL client for Node.js:

```bash
cd backend
npm install pg dotenv
npm remove better-sqlite3  # Remove SQLite if not needed
```

### Create `backend/src/config/db.js` (PostgreSQL version)

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }  // Required for Supabase
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
```

### Update `.env`

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
NODE_ENV=production
JWT_ACCESS_SECRET=your-32-char-secret-here
JWT_REFRESH_SECRET=your-32-char-secret-here
CORS_ORIGIN=http://localhost:5173
PORT=4000
```

### Update Route Files

Replace `db.exec()` and `db.prepare()` with async/await queries:

**Before (SQLite):**
```javascript
const db = require('../config/db');
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
const user = stmt.get(userId);
```

**After (PostgreSQL):**
```javascript
const pool = require('../config/db');

const query = 'SELECT * FROM users WHERE id = $1';
const result = await pool.query(query, [userId]);
const user = result.rows[0];
```

### Migration Script

Use this script to convert queries from SQLite to PostgreSQL:

**Changes needed:**
| SQLite | PostgreSQL |
|--------|-----------|
| `?` (params) | `$1, $2, $3` (numbered params) |
| `db.prepare()` | `await pool.query()` |
| `stmt.get()` | `result.rows[0]` |
| `stmt.all()` | `result.rows` |
| `db.exec()` | `await pool.query()` |
| Sync functions | Async/await |

## Step 4: Migrate Existing Data (if applicable)

If you have existing SQLite data to migrate:

```bash
# Export from SQLite
sqlite3 data/school.db ".dump" > backup.sql

# Convert SQL dialect (manual fixes needed for SQLite → PostgreSQL differences)
# Then import to Supabase:
psql postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres < backup.sql
```

Or use Supabase's import tool in the dashboard.

## Step 5: Test Locally

```bash
# Set DATABASE_URL in .env
cd backend
npm install
npm run seed   # Update seed.js to use async queries
npm run dev

# In another terminal
cd frontend
npm run dev

# Test login at http://localhost:5173
```

## Step 6: Deploy

### On Render.com

1. Create new Web Service
2. Connect GitHub repo
3. Set environment variables in Dashboard:
   - `DATABASE_URL` - Your Supabase connection string
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `NODE_ENV` = production
4. Build command: `cd backend && npm install`
5. Start command: `cd backend && node src/server.js`
6. Click "Create Web Service"

### On Railway.app

1. New project → GitHub repo
2. Add PostgreSQL plugin (optional if using Supabase)
3. Add environment variables
4. Deploy

### On Fly.io

1. Install flyctl CLI
2. Run: `flyctl launch`
3. Add DATABASE_URL to secrets: `flyctl secrets set DATABASE_URL=...`
4. Deploy: `flyctl deploy`

## Security Considerations

### 1. Row Level Security (RLS)

Enable RLS policies to restrict data access:

```sql
-- Allow users to only see their own data
CREATE POLICY "Users can see their own data" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
    )
  );

-- Allow admins to see all data
CREATE POLICY "Admins can see all data" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 2. Database URL

- Never commit `.env` file
- Use Supabase's "Connection Pooler" URL for production (under Settings → Database)
- Rotate password regularly

### 3. Backups

Supabase automatically backs up daily. Access backups in:
Project Settings → Backups

### 4. Monitoring

Monitor database performance in:
Project Settings → Database → Performance

## Troubleshooting

### Connection refused
- Verify Supabase project is running
- Check connection string has correct password
- Ensure IP allowlist includes your server

### Query timeouts
- Check database size (Project Settings → Database)
- Add indexes for frequently queried columns
- Consider connection pooling

### Auth errors
- Verify JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are set
- Check token expiration times
- Review audit logs in Supabase

## Reverting to SQLite

If you need to go back to SQLite:

```bash
npm remove pg
npm install better-sqlite3
# Restore original db.js from backup
```

## Next Steps

1. **Enable Supabase Auth** (optional) - Use instead of custom JWT
2. **Add real-time subscriptions** - Update UI automatically when data changes
3. **Enable backups** - Already done automatically
4. **Set up monitoring** - Use Supabase dashboard or external tools
5. **Configure RLS policies** - Restrict data access at database level

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Node.js Client](https://node-postgres.com/)
- [pg Library Documentation](https://github.com/brianc/node-postgres)
- [Supabase SQL Editor Guide](https://supabase.com/docs/reference/javascript/select)
