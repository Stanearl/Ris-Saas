import { Badge } from '@/components/ui/Badge';
import { getSensorsForTier } from '@/lib/mockData';

interface TruckSchematicProps {
  tier: 1 | 2 | 3;
}

const TruckSchematic = ({ tier }: TruckSchematicProps) => {
  const sensors = getSensorsForTier(tier);
  
  return (
    <div className="relative w-full h-64 bg-slate-100 rounded-lg overflow-hidden">
      {/* Professional Truck SVG */}
      <svg
        viewBox="0 0 800 300"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Trailer/Container */}
        <rect
          x="50"
          y="100"
          width="450"
          height="120"
          fill="#2d3748"
          stroke="#1a202c"
          strokeWidth="3"
          rx="4"
        />
        
        {/* Trailer Details */}
        <rect x="70" y="115" width="60" height="40" fill="#4a5568" rx="2" />
        <rect x="150" y="115" width="60" height="40" fill="#4a5568" rx="2" />
        <rect x="230" y="115" width="60" height="40" fill="#4a5568" rx="2" />
        <rect x="310" y="115" width="60" height="40" fill="#4a5568" rx="2" />
        <rect x="390" y="115" width="60" height="40" fill="#4a5568" rx="2" />
        
        {/* Fuel Tank under trailer */}
        <ellipse cx="400" cy="235" rx="40" ry="15" fill="#1a202c" stroke="#0f172a" strokeWidth="2" />
        
        {/* Cab */}
        <path
          d="M 500 100 L 500 180 L 520 200 L 680 200 L 700 180 L 700 100 L 680 80 L 520 80 Z"
          fill="#2d3748"
          stroke="#1a202c"
          strokeWidth="3"
        />
        
        {/* Cab Window */}
        <path
          d="M 520 95 L 520 160 L 540 175 L 660 175 L 680 160 L 680 95 Z"
          fill="#60a5fa"
          opacity="0.6"
          stroke="#1a202c"
          strokeWidth="2"
        />
        
        {/* Cab Details */}
        <rect x="690" y="140" width="8" height="30" fill="#ef4444" rx="2" />
        <circle cx="530" cy="120" r="3" fill="#fbbf24" />
        
        {/* Wheels - Trailer */}
        <g>
          <circle cx="150" cy="220" r="25" fill="#1a202c" stroke="#0f172a" strokeWidth="3" />
          <circle cx="150" cy="220" r="15" fill="#4a5568" />
          <circle cx="150" cy="220" r="8" fill="#1a202c" />
          
          <circle cx="200" cy="220" r="25" fill="#1a202c" stroke="#0f172a" strokeWidth="3" />
          <circle cx="200" cy="220" r="15" fill="#4a5568" />
          <circle cx="200" cy="220" r="8" fill="#1a202c" />
          
          <circle cx="400" cy="220" r="25" fill="#1a202c" stroke="#0f172a" strokeWidth="3" />
          <circle cx="400" cy="220" r="15" fill="#4a5568" />
          <circle cx="400" cy="220" r="8" fill="#1a202c" />
          
          <circle cx="450" cy="220" r="25" fill="#1a202c" stroke="#0f172a" strokeWidth="3" />
          <circle cx="450" cy="220" r="15" fill="#4a5568" />
          <circle cx="450" cy="220" r="8" fill="#1a202c" />
        </g>
        
        {/* Wheels - Cab */}
        <g>
          <circle cx="650" cy="200" r="25" fill="#1a202c" stroke="#0f172a" strokeWidth="3" />
          <circle cx="650" cy="200" r="15" fill="#4a5568" />
          <circle cx="650" cy="200" r="8" fill="#1a202c" />
        </g>
        
        {/* Connection between cab and trailer */}
        <rect x="490" y="140" width="20" height="40" fill="#4a5568" stroke="#1a202c" strokeWidth="2" />
      </svg>
      
      {/* Sensor Badges Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* GPS Node - Cab Roof */}
        {sensors.includes('GPS Node') && (
          <div className="absolute top-8 right-24 pointer-events-auto">
            <Badge variant="default" className="bg-blue-500 text-white shadow-lg animate-pulse">
              📡 GPS Node
            </Badge>
          </div>
        )}
        
        {/* Gateway - Cab */}
        {sensors.includes('Gateway') && (
          <div className="absolute top-20 right-32 pointer-events-auto">
            <Badge variant="default" className="bg-purple-500 text-white shadow-lg">
              🔌 Gateway
            </Badge>
          </div>
        )}
        
        {/* Axle Sensor A - Rear Wheels */}
        {sensors.includes('Axle Sensor A') && (
          <div className="absolute bottom-8 left-48 pointer-events-auto">
            <Badge variant="default" className="bg-green-500 text-white shadow-lg">
              ⚙️ Axle Sensor A
            </Badge>
          </div>
        )}
        
        {/* Air Suspension Sensor */}
        {sensors.includes('Air Suspension Sensor') && (
          <div className="absolute bottom-16 left-96 pointer-events-auto">
            <Badge variant="default" className="bg-yellow-500 text-white shadow-lg">
              🔧 Air Suspension
            </Badge>
          </div>
        )}
        
        {/* Fuel Flow Sensor - Tank */}
        {sensors.includes('Fuel Flow Sensor') && (
          <div className="absolute bottom-4 left-96 pointer-events-auto">
            <Badge variant="default" className="bg-orange-500 text-white shadow-lg">
              ⛽ Fuel Flow
            </Badge>
          </div>
        )}
        
        {/* Lidar */}
        {sensors.includes('Lidar') && (
          <div className="absolute top-12 right-16 pointer-events-auto">
            <Badge variant="default" className="bg-red-500 text-white shadow-lg animate-pulse">
              📊 Lidar
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};

export default TruckSchematic;
