import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '@/components/ui/Card';
import type { Device } from '@/lib/mockData';

interface DeviceMapProps {
  device: Device;
}

// Custom hook to fit bounds
function MapBounds({ route }: { route: Array<{ lat: number; lng: number }> }) {
  const map = useMap();
  
  useEffect(() => {
    if (route.length > 0) {
      const bounds = route.map(point => [point.lat, point.lng] as [number, number]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [route, map]);
  
  return null;
}

const DeviceMap = ({ device }: DeviceMapProps) => {
  // Custom marker icon
  const truckIcon = new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13"></rect>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
        <circle cx="5.5" cy="18.5" r="2.5"></circle>
        <circle cx="18.5" cy="18.5" r="2.5"></circle>
      </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
  
  const routeCoordinates: [number, number][] = device.route.map(point => [point.lat, point.lng]);
  const currentPosition: [number, number] = [device.location.lat, device.location.lng];
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        GPS Tracking Visualizer
      </h3>
      
      <div className="h-80 rounded-lg overflow-hidden border border-slate-200">
        <MapContainer
          center={currentPosition}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          {/* Dark Theme Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {/* Route Polyline */}
          <Polyline
            positions={routeCoordinates}
            color="#fbbf24"
            weight={4}
            opacity={0.8}
          />
          
          {/* Current Position Marker */}
          <Marker position={currentPosition} icon={truckIcon} />
          
          {/* Fit bounds to route */}
          <MapBounds route={device.route} />
        </MapContainer>
      </div>
      
      <div className="mt-4 text-sm text-slate-600">
        <p>Current Location: {device.location.lat.toFixed(4)}, {device.location.lng.toFixed(4)}</p>
        <p className="text-xs text-slate-500 mt-1">Near Awasi/Muhoroni, Kenya</p>
      </div>
    </Card>
  );
};

export default DeviceMap;
