# Vercel Deployment Guide

Deploy the School Admin application to Vercel (frontend) + any Node host (backend).

## Frontend Deployment on Vercel

### Step 1: Push to GitHub

Ensure your code is pushed to GitHub:

```bash
cd c:\Users\ITP\OneDrive\Desktop\school-admin
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Connect to Vercel

1. Visit [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New..." → "Project"
3. Find `Academy-ERP` repository and import it
4. Vercel auto-detects Vite configuration

### Step 3: Configure Environment Variables

**Critical**: Add environment variables for Vercel to build correctly.

In Vercel Dashboard:
- Go to Project Settings → Environment Variables
- Add: `VITE_API_URL` = `https://your-backend-url.com/api` (your production backend URL)
  - For dev/staging: `http://localhost:4000/api`
  - For production: `https://api.yourschool.com/api`

### Step 4: Deploy

1. Click "Deploy"
2. Vercel builds and deploys automatically
3. Your app is live at `https://[project-name].vercel.app`

### Step 5: Custom Domain (Optional)

1. Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

---

## Backend Deployment Options

The backend needs to run on a Node.js host (Vercel doesn't host Node backends).

### Option A: Render.com (Recommended)

1. Go to [render.com](https://render.com)
2. Create new "Web Service"
3. Connect GitHub repository
4. Configure:
   - **Name**: `school-admin-api`
   - **Runtime**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && node src/server.js`
5. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = `postgresql://...` (Supabase)
   - `JWT_ACCESS_SECRET` = (32+ char random string)
   - `JWT_REFRESH_SECRET` = (32+ char random string)
   - `PORT` = `4000`
   - `CORS_ORIGIN` = `https://your-vercel-frontend.vercel.app`
6. Deploy

Backend URL: `https://school-admin-api.onrender.com/api`

### Option B: Railway.app

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repo
4. Railway auto-detects it's a Node.js project
5. Add environment variables (same as above)
6. Deploy

### Option C: Fly.io

1. Install flyctl: `npm install -g flyctl`
2. Run: `flyctl launch`
3. Choose region
4. Set environment variables: `flyctl secrets set DATABASE_URL=...`
5. Deploy: `flyctl deploy`

---

## Troubleshooting Vercel Errors

### Error: "Cannot find module 'react'"

**Solution**: Vercel isn't finding dependencies. Ensure:
- ✅ `frontend/package.json` exists with React deps
- ✅ `frontend/package-lock.json` is committed to git
- ✅ `vercel.json` is in root with correct `buildCommand`

### Error: "VITE_API_URL is undefined"

**Solution**: Environment variable not set on Vercel.
- Go to Project Settings → Environment Variables
- Add `VITE_API_URL` pointing to your backend URL

### Error: "Build failed in X seconds"

**Solution**: Check build logs at Vercel dashboard → Deployments → click failed deployment → View Details.

Common issues:
- Missing Node modules → `npm install` runs in build
- Build script error → Run `npm run build` locally first
- Port conflicts → Use port 3000 for frontend, 4000 for backend

### Frontend can't reach backend API

**Solution**: CORS issue. Backend must allow frontend origin.

In backend `.env`:
```
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

Restart backend after change.

---

## Production Checklist

Before going live:

- [ ] Backend deployed and running
- [ ] Frontend connects to production backend API
- [ ] VITE_API_URL set correctly on Vercel
- [ ] CORS_ORIGIN set correctly on backend
- [ ] Database (Supabase) configured and accessible
- [ ] SSL/HTTPS enabled (automatic on Vercel)
- [ ] Admin account created and password changed
- [ ] Test login flow end-to-end
- [ ] Test all CRUD operations
- [ ] Check browser console for errors
- [ ] Monitor application performance
- [ ] Set up backups (Supabase auto-backup)
- [ ] Enable security headers (backend has Helmet)

---

## Monitoring & Logs

### Vercel Logs
- Go to Deployments tab
- Click latest deployment
- View build logs and runtime logs

### Backend Logs (Render/Railway)
- Render: Dashboard → Service → Logs
- Railway: Dashboard → Project → Deployments → View Logs

### Database Monitoring (Supabase)
- Dashboard → Home → Database Health
- Check query performance, storage used
- View audit logs: `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100;`

---

## Environment Variables Summary

### Frontend (Vercel)
```
VITE_API_URL=https://your-backend-url.com/api
```

### Backend (Render/Railway/Fly.io)
```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:password@host:5432/db
JWT_ACCESS_SECRET=your-32-char-secret-key-here
JWT_REFRESH_SECRET=your-32-char-secret-key-here
CORS_ORIGIN=https://your-vercel-frontend.vercel.app
SEED_ADMIN_PASSWORD=YourStrongPassword123!
```

---

## Rollback / Revert

### Vercel
- Deployments tab → click previous deployment → "Redeploy"

### Render/Railway
- Go to Deployment History
- Click "Redeploy" on a previous version

---

## Next Steps

1. Deploy backend first (test with `npm run seed`)
2. Deploy frontend second
3. Configure CORS and API URL
4. Test thoroughly in production
5. Monitor logs and performance
6. Set up monitoring alerts if available

**Documentation**: See [API.md](./API.md), [DEPLOYMENT.md](./DEPLOYMENT.md), [TESTING.md](./TESTING.md)
