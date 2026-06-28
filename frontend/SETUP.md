# RISAFRICA SYSTEMS - Frontend Setup Guide

## 🎉 Installation Complete!

All dependencies have been successfully installed. The frontend is ready to run.

## 🚀 Quick Start

### 1. Start the Development Server

```bash
cd frontend
npm run dev
```

The application will be available at: **http://localhost:3000**

### 2. Start the Go Backend (Required)

In a separate terminal, start the Go backend server:

```bash
# From the root directory
go run main.go
```

The backend API will run on: **http://localhost:8080**

## 📋 Prerequisites

Before running the frontend, ensure:

1. ✅ **Go Backend is Running** on port 8080
2. ✅ **MySQL Database** is set up with the schema from `schema.sql` and `schema_auth.sql`
3. ✅ **Environment Variables** are configured in `.env` file

## 🔐 Demo Login Credentials

```
Email: john.doe@example.com
Password: password123
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components (Button, Card, etc.)
│   │   ├── dashboard/       # Dashboard-specific components
│   │   └── SubscriptionLockout.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx    # Authentication page
│   │   └── DashboardPage.tsx # Main dashboard
│   ├── lib/
│   │   ├── api.ts           # API client with interceptors
│   │   └── utils.ts         # Utility functions
│   ├── store/
│   │   └── authStore.ts     # Zustand auth state
│   ├── types/
│   │   └── api.ts           # TypeScript interfaces
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 🎨 Features Implemented

### ✅ Authentication System
- JWT-based login with secure token storage
- Automatic token refresh on API requests
- 401 handling with automatic logout
- Protected routes

### ✅ Subscription Management
- 402 Payment Required detection
- Elegant subscription lockout overlay
- Paystack integration ready
- Real-time subscription status display

### ✅ Dashboard Components
- **Header**: Vehicle ID with hardware tier badge
- **Weight Module**: Large typography with dynamic color coding
  - Green: Normal weight
  - Yellow: Approaching limit (>90%)
  - Red: Overloaded
- **GPS Map**: Interactive Leaflet map with vehicle marker
- **Metrics Grid**: 
  - Fuel level with gradient progress bar
  - Speed display
  - Tier-based feature availability
- **ECU Lockout Badge**: Pulsing warning indicator

### ✅ Hardware Tier Classification
- **Tier 1**: Leaf Spring (basic weight monitoring)
- **Tier 2**: Air/Hydraulic (weight + speed)
- **Tier 3**: Full Suite (weight + speed + fuel + advanced sensors)

### ✅ UI/UX Excellence
- Dark, high-contrast corporate theme
- Skeleton loaders for optimal perceived performance
- Smooth transitions and animations
- Responsive design (mobile-first)
- Accessible components (Shadcn UI)

## 🛠️ Available Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## 🔧 Configuration

### API Proxy
The frontend proxies API requests to the backend. Update `vite.config.ts` if your backend runs on a different port:

```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8080', // Change this if needed
      changeOrigin: true,
    },
  },
}
```

### Environment Variables
No frontend environment variables are required. All configuration is done through the backend API.

## 📊 API Endpoints Used

- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/devices/{device_id}/live` - Live telemetry data (protected)
- `POST /api/webhooks/paystack` - Paystack webhook handler

## 🎯 Testing the Application

### 1. Login Flow
1. Navigate to http://localhost:3000
2. You'll be redirected to `/login`
3. Enter demo credentials
4. Upon successful login, you'll be redirected to `/dashboard`

### 2. Dashboard Features
- View real-time vehicle telemetry (refreshes every 5 seconds)
- See weight status with dynamic color coding
- Interact with GPS map
- View fuel and speed metrics (if available for hardware tier)
- ECU lockout indicator (if throttle is active)

### 3. Subscription Lockout
To test the subscription lockout:
1. Modify the backend to return 402 status
2. The overlay will automatically appear
3. User can update payment or sign out

## 🐛 Troubleshooting

### Issue: "Cannot connect to backend"
**Solution**: Ensure the Go backend is running on port 8080

### Issue: "No data available"
**Solution**: 
1. Check that the database has sample data
2. Verify the device ID exists in the database
3. Check backend logs for errors

### Issue: TypeScript errors
**Solution**: Run `npm install` again to ensure all type definitions are installed

### Issue: Map not displaying
**Solution**: 
1. Check browser console for errors
2. Ensure Leaflet CSS is loaded
3. Verify GPS coordinates are valid

## 📱 Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)

## 🚀 Production Deployment

### Build for Production
```bash
npm run build
```

The optimized build will be in the `dist/` folder.

### Deploy Options
- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy`
- **Static Hosting**: Upload `dist/` folder
- **Docker**: Create Dockerfile with nginx

### Environment Configuration
Update the API proxy target in production to point to your production backend URL.

## 📄 License

Proprietary - RISAFRICA SYSTEMS © 2026

## 🆘 Support

For issues or questions:
- Check the main README.md
- Review API documentation in `api-contract.md`
- Contact: support@risafrica.com
