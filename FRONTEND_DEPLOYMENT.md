# RISAFRICA SYSTEMS - Complete Deployment Guide

## 🎯 Overview

This guide covers the complete deployment of the RISAFRICA SYSTEMS Compliance Tool Dashboard, including both the Go backend and React frontend.

## 📦 What's Been Built

### Backend (Go)
- ✅ JWT authentication system
- ✅ Paystack subscription integration
- ✅ MySQL database with partitioning
- ✅ RESTful API endpoints
- ✅ Middleware for auth and subscription checks
- ✅ Real-time telemetry ingestion

### Frontend (React + TypeScript)
- ✅ Modern, responsive dashboard
- ✅ Secure authentication flow
- ✅ Real-time data visualization
- ✅ Hardware tier classification
- ✅ Subscription lockout handling
- ✅ Interactive GPS mapping
- ✅ Dynamic weight monitoring

## 🚀 Quick Start (Development)

### 1. Start the Backend

```bash
# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run the Go server
go run main.go
```

Backend will be available at: **http://localhost:8080**

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at: **http://localhost:3000**

### 3. Access the Dashboard

1. Open http://localhost:3000
2. Login with demo credentials:
   - Email: `john.doe@example.com`
   - Password: `password123`
3. View the live dashboard with vehicle DEV-TRK-001

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     RISAFRICA SYSTEMS                        │
│                  Compliance Tool Dashboard                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   React Frontend │◄───────►│   Go Backend     │
│   (Port 3000)    │  HTTP   │   (Port 8080)    │
│                  │  /api   │                  │
│  - Login Page    │         │  - JWT Auth      │
│  - Dashboard     │         │  - API Routes    │
│  - Real-time UI  │         │  - Middleware    │
└──────────────────┘         └──────────────────┘
                                      │
                                      ▼
                             ┌──────────────────┐
                             │  MySQL Database  │
                             │  (Port 3306)     │
                             │                  │
                             │  - Users         │
                             │  - Devices       │
                             │  - Telemetry     │
                             │  - Subscriptions │
                             └──────────────────┘
                                      │
                                      ▼
                             ┌──────────────────┐
                             │  Paystack API    │
                             │  (Webhooks)      │
                             └──────────────────┘
```

## 🔐 Security Features

1. **JWT Authentication**
   - Secure token generation
   - Token expiration (168 hours default)
   - Automatic token refresh

2. **Password Security**
   - Bcrypt hashing
   - Salt rounds: 10

3. **API Protection**
   - JWT middleware on protected routes
   - Subscription status validation
   - 402 Payment Required for expired subscriptions

4. **CORS Configuration**
   - Configured for frontend origin
   - Secure headers

## 📊 Database Schema

### Users Table
- Authentication credentials
- Subscription status
- Paystack integration fields

### Devices Table
- Vehicle information
- Hardware configuration
- Load limits

### Telemetry Table (Partitioned)
- Time-series data
- GPS coordinates
- Weight, fuel, speed metrics
- ECU status

### Subscription Events Table
- Audit log for payment events
- Paystack webhook data

## 🎨 Frontend Features

### Design System
- **Dark Theme**: High-contrast corporate aesthetic
- **Color Palette**: 
  - Primary: Blue (#3B82F6)
  - Success: Green (#10B981)
  - Warning: Yellow (#F59E0B)
  - Danger: Red (#EF4444)

### Components
1. **Login Page**
   - Email/password form
   - Error handling
   - Loading states

2. **Dashboard Header**
   - Vehicle ID display
   - Hardware tier badge
   - User info with subscription status

3. **Weight Module**
   - Large typography (7xl font)
   - Dynamic color transitions
   - Progress bar
   - Overload warnings

4. **GPS Map**
   - Leaflet integration
   - Custom truck marker
   - Real-time position updates

5. **Metrics Grid**
   - Fuel level with gradient bar
   - Speed display
   - Tier-based availability

6. **ECU Lockout Badge**
   - Pulsing animation
   - Critical warning display

7. **Subscription Lockout**
   - Full-screen overlay
   - Payment update prompt
   - Elegant blur effect

## 🔄 Data Flow

### Authentication Flow
```
1. User enters credentials
2. Frontend sends POST /api/auth/login
3. Backend validates credentials
4. Backend generates JWT token
5. Frontend stores token in localStorage (Zustand persist)
6. Token attached to all subsequent requests
```

### Dashboard Data Flow
```
1. Dashboard loads
2. React Query fetches GET /api/devices/{id}/live
3. JWT token sent in Authorization header
4. Backend validates token and subscription
5. Backend returns latest telemetry
6. Frontend updates UI
7. Refresh every 5 seconds (React Query refetchInterval)
```

### Subscription Lockout Flow
```
1. User's subscription expires
2. API request returns 402 Payment Required
3. Axios interceptor catches 402
4. Custom event dispatched: 'subscription-lockout'
5. SubscriptionLockout component listens for event
6. Overlay displayed with payment options
```

## 🧪 Testing

### Backend Testing
```bash
# Health check
curl http://localhost:8080/health

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@example.com","password":"password123"}'

# Get live data (replace TOKEN)
curl http://localhost:8080/api/devices/DEV-TRK-001/live \
  -H "Authorization: Bearer TOKEN"
```

### Frontend Testing
1. Open browser DevTools
2. Check Network tab for API calls
3. Verify JWT token in request headers
4. Test subscription lockout by modifying backend response

## 📈 Performance Optimizations

### Frontend
- Code splitting with React.lazy
- React Query caching (30s stale time)
- Skeleton loaders for perceived performance
- Optimized re-renders with React.memo

### Backend
- Database connection pooling (100 max connections)
- Partitioned telemetry table for fast queries
- Indexed columns for common queries
- Prepared statements for batch inserts

## 🚢 Production Deployment

### Backend Deployment
1. Build binary: `go build -o risafrica-backend main.go`
2. Set production environment variables
3. Deploy to cloud (AWS, GCP, Azure)
4. Set up reverse proxy (nginx)
5. Enable HTTPS with SSL certificate

### Frontend Deployment
1. Build: `cd frontend && npm run build`
2. Deploy `dist/` folder to:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - Static hosting
3. Update API proxy to production backend URL

### Database Deployment
1. Use managed MySQL service (AWS RDS, Google Cloud SQL)
2. Set up automated backups
3. Configure partition management cron job
4. Enable monitoring and alerts

## 📝 Environment Variables

### Backend (.env)
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=iot_telemetry
SERVER_PORT=8080
JWT_SECRET_KEY=your_secret_key_here
JWT_ISSUER=risafrica-systems
JWT_EXPIRATION_HOURS=168
PAYSTACK_SECRET_KEY=your_paystack_secret
```

## 🎯 Next Steps

1. **Add More Vehicles**: Insert additional devices in the database
2. **Customize Tiers**: Modify hardware tier logic in `frontend/src/types/api.ts`
3. **Paystack Integration**: Complete payment flow with real Paystack account
4. **Analytics**: Add charts and historical data views
5. **Notifications**: Implement real-time alerts for overload conditions
6. **Mobile App**: Build React Native version using same API

## 📞 Support

For technical support or questions:
- Email: support@risafrica.com
- Documentation: See README.md files
- API Contract: See api-contract.md

## 📄 License

Proprietary - RISAFRICA SYSTEMS © 2026

---

**Built with ❤️ by Claude Code using Everything Claude Code standards**
