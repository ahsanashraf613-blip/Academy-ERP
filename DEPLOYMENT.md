# Deployment Guide

This guide covers deploying School Admin to various hosting platforms.

## Prerequisites

- Node.js 20+ (for manual deployment)
- Docker & Docker Compose (for containerized deployment)
- Git
- A PostgreSQL or SQLite database

## Quick Start with Docker Compose

The easiest way to deploy locally or on a server with Docker installed:

```bash
# 1. Clone the repository
git clone <repo-url>
cd school-admin

# 2. Create environment file
cp .env.example .env

# 3. Edit .env with production values
# - Generate new JWT secrets: openssl rand -hex 32
# - Set strong admin password (12+ characters)
# - Update CORS_ORIGIN to your domain

# 4. Start the application
docker-compose up -d

# 5. Seed the database (first time only)
docker-compose exec api node src/config/seed.js

# Application is now running:
# - API: http://localhost:4000
# - Web: http://localhost:80
```

## Manual Deployment

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env

# Edit .env with production values
nano .env

# Generate JWT secrets
openssl rand -hex 32  # Run twice, once for each secret

# Seed initial admin account
npm run seed

# Start the server
NODE_ENV=production npm start
```

### Frontend Setup

```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=https://your-api-domain.com/api" > .env

# Build for production
npm run build

# The dist/ folder contains static files ready to serve
```

---

## Platform-Specific Deployment

### Render.com

#### Backend Deployment

1. **Create Web Service**
   - Connect your GitHub repository
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`

2. **Set Environment Variables**
   - `NODE_ENV`: production
   - `JWT_ACCESS_SECRET`: (generate: `openssl rand -hex 32`)
   - `JWT_REFRESH_SECRET`: (generate: `openssl rand -hex 32`)
   - `CORS_ORIGIN`: https://your-frontend-domain.onrender.com
   - `DB_PATH`: /data/school.db
   - `SEED_ADMIN_PASSWORD`: (your strong password)

3. **Add Persistent Disk**
   - Mount at: `/data`
   - Size: 1 GB (or more as needed)

4. **Deploy**
   - Push to GitHub
   - Render automatically deploys

#### Frontend Deployment

1. **Create Static Site**
   - Connect your GitHub repository
   - Build Command: `cd frontend && npm run build`
   - Publish Directory: `frontend/dist`

2. **Add Redirect Rules** (optional, for SPA)
   - Create `public/vercel.json` or `public/_redirects`

3. **Update API URL in Frontend**
   - Add environment variable: `VITE_API_URL=https://your-api.onrender.com/api`

---

### Railway.app

#### Backend Deployment

1. **Create New Project**
   - Connect GitHub repository
   - Select Node.js environment

2. **Add Environment Variables**
   - Same as Render (see above)

3. **Add PostgreSQL or SQLite Database**
   - Use SQLite with persistent volume: `/data/school.db`

4. **Deploy**
   - Railway automatically builds and deploys on git push

#### Frontend Deployment

1. **Create Static Service**
   - Select Static Site
   - Build Command: `cd frontend && npm run build`
   - Publish Directory: `frontend/dist`

---

### Fly.io

#### Backend Deployment

1. **Initialize Fly App**
   ```bash
   fly launch --name school-admin-api
   ```

2. **Create fly.toml Configuration**
   ```toml
   app = "school-admin-api"
   primary_region = "jnb"  # Johannesburg, adjust for your region
   
   [build]
   builder = "heroku"
   buildpacks = ["heroku/nodejs"]
   
   [env]
   NODE_ENV = "production"
   SEED_ADMIN_PASSWORD = "your-strong-password"
   # ... other variables
   
   [[services]]
   protocol = "tcp"
   internal_port = 4000
   processes = ["app"]
   
   [[services.ports]]
   port = 80
   handlers = ["http"]
   
   [[services.ports]]
   port = 443
   handlers = ["tls", "http"]
   ```

3. **Add Persistent Storage**
   ```bash
   fly volumes create data -s 10  # 10 GB
   fly volumes list
   ```

4. **Deploy**
   ```bash
   fly deploy
   fly secrets set JWT_ACCESS_SECRET="your-secret"
   fly secrets set JWT_REFRESH_SECRET="your-secret"
   fly release
   ```

---

### Traditional VPS (Ubuntu/Debian)

#### Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 process manager
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

#### Backend Setup

```bash
# Create application directory
sudo mkdir -p /opt/school-admin
cd /opt/school-admin

# Clone repository
sudo git clone <repo-url> .

# Install dependencies
cd backend
sudo npm install --production

# Create .env file
sudo cp .env.example .env
sudo nano .env  # Edit with production values

# Seed database
sudo node src/config/seed.js

# Start with PM2
sudo pm2 start src/server.js --name "school-admin-api"
sudo pm2 startup
sudo pm2 save
```

#### Frontend Setup & Nginx Configuration

```bash
cd ../frontend

# Build frontend
npm install
npm run build

# Configure Nginx
sudo nano /etc/nginx/sites-available/school-admin
```

```nginx
upstream api {
  server localhost:4000;
}

server {
  listen 80;
  server_name your-domain.com www.your-domain.com;

  # Redirect HTTP to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name your-domain.com www.your-domain.com;

  ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

  root /opt/school-admin/frontend/dist;
  index index.html;

  # Serve SPA
  location / {
    try_files $uri $uri/ /index.html;
    expires 1h;
    add_header Cache-Control "public, immutable";
  }

  # Don't cache index.html
  location = /index.html {
    expires -1;
    add_header Cache-Control "public, must-revalidate";
  }

  # Proxy API requests
  location /api/ {
    proxy_pass http://api/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Gzip
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/school-admin /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

#### Monitoring & Logs

```bash
# View PM2 logs
pm2 logs school-admin-api

# Monitor processes
pm2 monit

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Production Checklist

- [ ] Generate strong JWT secrets (minimum 32 characters)
- [ ] Set `NODE_ENV=production`
- [ ] Use strong admin password (12+ characters)
- [ ] Enable HTTPS/SSL (Render, Railway, Fly, and VPS)
- [ ] Set correct `CORS_ORIGIN` for your frontend domain
- [ ] Configure rate limiting for login endpoint
- [ ] Set up database backups (automated daily minimum)
- [ ] Monitor logs and error rates
- [ ] Set up alerts for failed logins and system errors
- [ ] Test password reset/recovery flow
- [ ] Enable database encryption at rest (if supported)
- [ ] Use firewall rules to restrict database access
- [ ] Regularly update Node.js and dependencies

---

## Database Backup

### SQLite Backup (Automatic)

```bash
# Create backup script
cat > /opt/school-admin/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/school-admin/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp /data/school.db $BACKUP_DIR/school.db.$TIMESTAMP
# Keep only last 30 days
find $BACKUP_DIR -name "school.db.*" -mtime +30 -delete
EOF

chmod +x /opt/school-admin/backup.sh

# Add to crontab (runs daily at 2 AM)
(crontab -l; echo "0 2 * * * /opt/school-admin/backup.sh") | crontab -
```

---

## Monitoring & Logging

### Key Metrics to Monitor

1. **API Response Time**: Target < 200ms for 95th percentile
2. **Error Rate**: Target < 0.1%
3. **Database Size**: Monitor growth rate
4. **Disk Space**: Alert at 80% capacity
5. **Failed Logins**: Spike detection for brute force attempts
6. **Active Users**: Session count and concurrent connections

### Logging Best Practices

- Ship logs to centralized logging service (Datadog, New Relic, Papertrail)
- Enable audit logging for all data changes
- Monitor failed authentication attempts
- Alert on critical errors and unusual activity

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs school-admin-api

# Verify environment variables
echo $NODE_ENV
echo $JWT_ACCESS_SECRET

# Check port availability
lsof -i :4000
```

### Database locked errors
- Ensure only one instance of the backend is running
- Check for stale lock files in data directory
- Restart the service

### CORS errors
- Verify `CORS_ORIGIN` matches your frontend domain exactly
- Include protocol (http:// or https://)
- No trailing slashes

### High memory usage
- Check for memory leaks in logs
- Restart PM2 process
- Increase server RAM or implement caching

---

## Support & Documentation

- API Reference: See [API.md](./API.md)
- README: See [README.md](./README.md)
- Security: See backend README for security details
