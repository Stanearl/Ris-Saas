// Mock Data Service for Fleet Telemetry Platform
// Provides realistic data when API is unavailable

export interface Device {
  id: string;
  name: string;
  status: 'online' | 'warning' | 'offline';
  deviceId: string;
  hardwareTier: 1 | 2 | 3;
  lastSeen: string;
  location: {
    lat: number;
    lng: number;
  };
  weight: {
    current: number;
    limit: number;
    capacity: number;
  };
  fuel: {
    current: number;
    capacity: number;
  };
  speed: number;
  route: Array<{ lat: number; lng: number; timestamp: string }>;
}

export interface WeightDataPoint {
  timestamp: string;
  weight: number;
  time: string; // formatted for display
}

export interface FleetStats {
  total: number;
  online: number;
  warnings: number;
  offline: number;
}

// Generate realistic weight fluctuation data for 24 hours
const generateWeightData = (): WeightDataPoint[] => {
  const data: WeightDataPoint[] = [];
  const now = new Date();
  
  // Generate 24 data points (one per hour)
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = timestamp.getHours();
    
    // Simulate realistic weight patterns
    let weight: number;
    if (hour >= 6 && hour < 10) {
      // Morning loading
      weight = 22000 + Math.random() * 3000;
    } else if (hour >= 10 && hour < 16) {
      // Fully loaded during day
      weight = 32000 + Math.random() * 2000;
    } else if (hour >= 16 && hour < 20) {
      // Unloading
      weight = 28000 - (hour - 16) * 1500 + Math.random() * 1000;
    } else {
      // Night - lighter loads
      weight = 23000 + Math.random() * 2000;
    }
    
    data.push({
      timestamp: timestamp.toISOString(),
      weight: Math.round(weight),
      time: timestamp.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    });
  }
  
  return data;
};

// Generate realistic GPS route
const generateRoute = (centerLat: number, centerLng: number): Array<{ lat: number; lng: number; timestamp: string }> => {
  const route = [];
  const now = new Date();
  
  // Generate 20 points along a route
  for (let i = 19; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 15 * 60 * 1000); // 15 min intervals
    
    // Create a realistic route pattern
    const progress = (19 - i) / 19;
    const lat = centerLat + (Math.sin(progress * Math.PI) * 0.05) + (Math.random() - 0.5) * 0.01;
    const lng = centerLng + (progress * 0.1) + (Math.random() - 0.5) * 0.01;
    
    route.push({
      lat,
      lng,
      timestamp: timestamp.toISOString()
    });
  }
  
  return route;
};

// Mock devices
export const mockDevices: Device[] = [
  {
    id: 'dev-001',
    name: 'Tango (Tipper)',
    status: 'online',
    deviceId: 'RIS-KE-TNG-001',
    hardwareTier: 3,
    lastSeen: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
    location: {
      lat: -0.15,
      lng: 35.0
    },
    weight: {
      current: 33338,
      limit: 38000,
      capacity: 38000
    },
    fuel: {
      current: 241,
      capacity: 500
    },
    speed: 45,
    route: generateRoute(-0.15, 35.0)
  },
  {
    id: 'dev-002',
    name: 'Alpha (Flatbed)',
    status: 'online',
    deviceId: 'RIS-KE-ALP-002',
    hardwareTier: 2,
    lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    location: {
      lat: -0.18,
      lng: 35.05
    },
    weight: {
      current: 28500,
      limit: 35000,
      capacity: 35000
    },
    fuel: {
      current: 380,
      capacity: 450
    },
    speed: 52,
    route: generateRoute(-0.18, 35.05)
  },
  {
    id: 'dev-003',
    name: 'Bravo (Container)',
    status: 'warning',
    deviceId: 'RIS-KE-BRV-003',
    hardwareTier: 1,
    lastSeen: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
    location: {
      lat: -0.12,
      lng: 34.95
    },
    weight: {
      current: 36800,
      limit: 38000,
      capacity: 38000
    },
    fuel: {
      current: 120,
      capacity: 500
    },
    speed: 38,
    route: generateRoute(-0.12, 34.95)
  }
];

// Get fleet statistics
export const getFleetStats = (): FleetStats => {
  return {
    total: mockDevices.length,
    online: mockDevices.filter(d => d.status === 'online').length,
    warnings: mockDevices.filter(d => d.status === 'warning').length,
    offline: mockDevices.filter(d => d.status === 'offline').length
  };
};

// Get device by ID
export const getDeviceById = (id: string): Device | undefined => {
  return mockDevices.find(d => d.id === id);
};

// Get weight data for a device
export const getWeightData = (deviceId: string): WeightDataPoint[] => {
  return generateWeightData();
};

// Get sensors for a hardware tier
export const getSensorsForTier = (tier: 1 | 2 | 3): string[] => {
  const baseSensors = ['GPS Node', 'Gateway'];
  
  if (tier >= 1) {
    baseSensors.push('Axle Sensor A');
  }
  if (tier >= 2) {
    baseSensors.push('Air Suspension Sensor');
  }
  if (tier >= 3) {
    baseSensors.push('Fuel Flow Sensor', 'Lidar');
  }
  
  return baseSensors;
};

// Mock user data
export const mockUser = {
  name: 'John Kamau',
  email: 'john.kamau@risafrica.com',
  avatar: 'JK',
  subscription: {
    plan: 'Professional',
    status: 'active',
    expiresAt: '2026-12-31'
  }
};
