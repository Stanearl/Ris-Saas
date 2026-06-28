# RISAFRICA SYSTEMS - Compliance Tool Dashboard

A modern, high-performance React dashboard for real-time vehicle compliance monitoring with hardware tier classification and subscription-based access control.

## 🚀 Features

- **Secure Authentication**: JWT-based login with secure token storage
- **Real-time Telemetry**: Live vehicle data with 5-second refresh intervals
- **Hardware Tier Classification**: 
  - Tier 1: Leaf Spring (basic weight monitoring)
  - Tier 2: Air/Hydraulic (weight + speed)
  - Tier 3: Full Suite (weight + speed + fuel + advanced sensors)
- **Subscription Lockout**: Elegant 402 Payment Required handling with Paystack integration
- **Weight Compliance**: Dynamic visual indicators for overload conditions
- **GPS Tracking**: Interactive map with real-time vehicle location
- **Responsive Design**: Mobile-first, accessible UI with Shadcn components

## 🛠️ Tech Stack

- **React 18** with TypeScript
- **Vite** for blazing-fast development
- **Tailwind CSS** for utility-first styling
- **Shadcn UI** for accessible, beautiful components
- **React Query** for data fetching, caching, and synchronization
- **Zustand** for lightweight global state management
- **React Leaflet** for interactive maps
- **Axios** for HTTP requests with interceptors

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Configuration

The frontend proxies API requests to the Go backend running on `localhost:8080`. Update `vite.config.ts` if your backend runs on a different port.

## 🎨 Design System

The dashboard uses a dark, high-contrast corporate aesthetic with:
- Sleek card-based layouts
- Smooth color transitions for weight status
- Skeleton loaders for optimal perceived performance
- Pulsing animations for critical alerts

## 🔐 Authentication Flow

1. User logs in with email/password
2. JWT token stored securely in localStorage via Zustand persist
3. Token automatically attached to all API requests
4. 401 responses trigger automatic logout
5. 402 responses trigger subscription lockout overlay

## 📊 Dashboard Components

- **DashboardHeader**: Vehicle ID and hardware tier badge
- **WeightModule**: Large typography display with dynamic color coding
- **GPSMap**: Interactive Leaflet map centered on vehicle location
- **MetricsGrid**: Fuel level progress bar and speed gauge
- **ECULockoutBadge**: Pulsing warning for active throttle control
- **SubscriptionLockout**: Full-screen overlay for payment issues

## 🌍 Demo Credentials

```
Email: john.doe@example.com
Password: password123
```

## 📝 API Integration

The frontend expects the following API endpoints:

- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/devices/{device_id}/live` - Live telemetry data (protected)
- `POST /api/webhooks/paystack` - Paystack webhook handler

## 🚦 Development

```bash
# Run with hot reload
npm run dev

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## 📄 License

Proprietary - RISAFRICA SYSTEMS © 2026
