import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { mockDevices } from '@/lib/mockData';
import { RegisterDeviceModal } from '@/components/device/RegisterDeviceModal';

const FleetPage = () => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'warning':
        return 'warning';
      case 'offline':
        return 'destructive';
      default:
        return 'default';
    }
  };
  
  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            The Garage - Your paired fleet devices
          </h1>
          <p className="text-slate-500 mt-1">
            Manage and monitor all registered vehicles
          </p>
        </div>
        <RegisterDeviceModal />
      </div>
      
      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockDevices.map((device) => (
          <Link key={device.id} to={`/fleet/${device.id}`}>
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="space-y-4">
                {/* Header with Name and Status */}
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {device.name}
                  </h3>
                  <Badge variant={getStatusVariant(device.status)}>
                    {device.status.toUpperCase()}
                  </Badge>
                </div>
                
                {/* Device Details */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Device ID:</span>
                    <span className="font-medium text-slate-900">{device.deviceId}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Hardware Tier:</span>
                    <span className="font-medium text-slate-900">Tier {device.hardwareTier}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-slate-500">Last Seen:</span>
                    <span className="font-medium text-slate-900 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatLastSeen(device.lastSeen)}
                    </span>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Weight</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {(device.weight.current / 1000).toFixed(1)}t
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Speed</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {device.speed} km/h
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default FleetPage;
