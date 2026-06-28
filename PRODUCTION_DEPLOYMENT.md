# Production Deployment Guide

This guide covers deploying the RIS Go IoT Telemetry Platform to production.

## Architecture Overview

- **Frontend**: Cloudflare Pages at `https://connect.ris.africa`
- **Backend**: Hetzner VPS with Docker (Go API + MySQL)
- **Database**: MySQL 8.0 in Docker container with persistent volumes

---

## Backend Deployment (Hetzner VPS)

### Prerequisites

1. A Hetzner VPS with Docker and Docker Compose installed
2. Domain/subdomain pointing to your VPS IP
3. SSH access to the server

### Step 1: Prepare the Server

```bash
# SSH into your Hetzner VPS
ssh root@your-server-ip

# Update system packages
apt update && apt upgrade -y

# Install Docker (if not already installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Verify installations
docker --version
docker-compose --version
```

### Step 2: Clone Repository

```bash
# Create application directory
mkdir -p /opt/ris-go
cd /opt/ris-go

# Clone your repository (or upload files via SCP/SFTP)
git clone <your-repo-url> .
# OR upload files manually
```

### Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
nano .env
```

Add the following configuration:

```env
# Database Configuration
DB_ROOT_PASSWORD=your_secure_root_password_here
DB_NAME=iot_telemetry
DB_USER=iot_user
DB_PASSWORD=your_secure_db_password_here

# JWT Configuration
JWT_SECRET_KEY=your_very_long_and_secure_jwt_secret_key_here
JWT_ISSUER=iot-telemetry-platform
JWT_EXPIRATION_HOURS=168

# Paystack Configuration
PAYSTACK_SECRET_KEY=your_paystack_secret_key_here
```

**Important**: Generate strong, random passwords for production!

```bash
# Generate secure passwords
openssl rand -base64 32
```

### Step 4: Deploy with Docker Compose

```bash
# Build and start services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f database

# Check health
curl http://localhost:8080/health
```

### Step 5: Configure Reverse Proxy (Nginx)

Install and configure Nginx as a reverse proxy:

```bash
# Install Nginx
apt install nginx -y

# Create Nginx configuration
nano /etc/nginx/sites-available/ris-api
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # Replace with your API domain

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/ris-api /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Step 6: Setup SSL with Let's Encrypt

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
certbot --nginx -d api.yourdomain.com

# Certbot will automatically configure HTTPS
# Certificates auto-renew via cron
```

### Step 7: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

---

## Frontend Deployment (Cloudflare Pages)

### Prerequisites

1. Cloudflare account
2. Domain configured in Cloudflare
3. GitHub repository with frontend code

### Step 1: Update API Base URL

Update `frontend/src/lib/api.ts` to point to your production API:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.yourdomain.com';
```

### Step 2: Deploy to Cloudflare Pages

1. **Connect Repository**:
   - Go to Cloudflare Dashboard → Pages
   - Click "Create a project"
   - Connect your GitHub repository
   - Select the repository containing your frontend

2. **Configure Build Settings**:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`

3. **Environment Variables**:
   Add in Cloudflare Pages settings:
   ```
   VITE_API_BASE_URL=https://api.yourdomain.com
   ```

4. **Custom Domain**:
   - Go to Pages project → Custom domains
   - Add `connect.ris.africa`
   - Follow DNS configuration instructions

5. **Deploy**:
   - Click "Save and Deploy"
   - Cloudflare will build and deploy automatically
   - Future pushes to main branch will auto-deploy

---

## Database Management

### Backup Database

```bash
# Create backup
docker exec ris-mysql mysqldump -u root -p${DB_ROOT_PASSWORD} iot_telemetry > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker exec -i ris-mysql mysql -u root -p${DB_ROOT_PASSWORD} iot_telemetry < backup_file.sql
```

### Access MySQL Console

```bash
docker exec -it ris-mysql mysql -u root -p
```

### View Database Logs

```bash
docker-compose logs -f database
```

---

## Monitoring & Maintenance

### View Application Logs

```bash
# Backend logs
docker-compose logs -f backend

# Database logs
docker-compose logs -f database

# All logs
docker-compose logs -f
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart database
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Or use rolling update
docker-compose up -d --no-deps --build backend
```

### Check Resource Usage

```bash
# Docker stats
docker stats

# System resources
htop
df -h
```

---

## Security Checklist

- ✅ Strong passwords for database and JWT secret
- ✅ SSL/TLS enabled (HTTPS)
- ✅ Firewall configured (UFW)
- ✅ Regular database backups
- ✅ Docker containers run as non-root users
- ✅ CORS configured for production domain only
- ✅ Environment variables secured (not in git)
- ✅ Regular system updates
- ✅ Monitoring and logging enabled

---

## Troubleshooting

### Backend Not Starting

```bash
# Check logs
docker-compose logs backend

# Check if port is in use
netstat -tulpn | grep 8080

# Restart service
docker-compose restart backend
```

### Database Connection Issues

```bash
# Check database health
docker-compose ps database

# Test connection
docker exec ris-mysql mysqladmin ping -h localhost -u root -p

# Check database logs
docker-compose logs database
```

### CORS Errors

Ensure your production frontend URL is added to the CORS whitelist in `main.go`:

```go
allowedOrigins := []string{
    "https://connect.ris.africa",
    // Add other domains as needed
}
```

### SSL Certificate Issues

```bash
# Renew certificates manually
certbot renew

# Check certificate status
certbot certificates
```

---

## Performance Optimization

### Database Optimization

```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_device_id ON telemetry(device_id);
CREATE INDEX idx_timestamp ON telemetry(timestamp);
CREATE INDEX idx_user_email ON users(email);
```

### Docker Resource Limits

Edit `docker-compose.yml` to add resource limits:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

---

## Support & Maintenance

### Regular Tasks

- **Daily**: Monitor logs and system resources
- **Weekly**: Review database size and performance
- **Monthly**: Update system packages and Docker images
- **Quarterly**: Review and rotate secrets/passwords

### Backup Strategy

1. **Database**: Daily automated backups
2. **Configuration**: Version controlled in Git
3. **Volumes**: Weekly snapshots of Docker volumes

---

## Contact & Resources

- **Documentation**: See `README.md` and `QUICKSTART.md`
- **API Contract**: See `api-contract.md`
- **Frontend Setup**: See `frontend/SETUP.md`

---

**Deployment Date**: _[Add date when deployed]_  
**Last Updated**: _[Update when making changes]_
