import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Loader2, Truck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { fleetAPI, deviceAPI } from '@/lib/api';
import type { Device } from '@/types/api';
import { RegisterDeviceModal } from '@/components/device/RegisterDeviceModal';

const getStatusVariant = (status: Device['status']) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'maintenance':
      return 'warning';
    case 'inactive':
      return 'destructive';
    default:
      return 'default';
  }
};

const getSubscriptionBadge = (subscriptionStatus: Device['subscription_status']) => {
  switch (subscriptionStatus) {
    case 'active':
      return <Badge variant="success">ACTIVE</Badge>;
    case 'trial':
      return <Badge variant="default">TRIAL</Badge>;
    case 'past_due':
      return <Badge variant="warning">PAST DUE</Badge>;
    case 'canceled':
      return <Badge variant="destructive">CANCELED</Badge>;
    default:
      return <Badge variant="default">{subscriptionStatus}</Badge>;
  }
};

const formatLastSeen = (timestamp: string | null) => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

// Live telemetry (weight/speed) for a single device card. Isolated per-card
// so one device's failed/missing telemetry doesn't block the fleet grid.
function FleetDeviceStats({ deviceId }: { deviceId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['device-live', deviceId],
    queryFn: () => deviceAPI.getLiveData(deviceId),
    refetchInterval: 5000,
    retry: false,
  });

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-slate-400" />;

  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500">Weight</p>
          <p className="text-sm font-semibold text-slate-400">No data</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Speed</p>
          <p className="text-sm font-semibold text-slate-400">No data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs text-slate-500">Weight</p>
        <p className="text-sm font-semibold text-slate-900">
          {(data.reading.weight_kg / 1000).toFixed(1)}t
        </p>
      </div>
      <div>
        <p className="text-xs text-slate-500">Speed</p>
        <p className="text-sm font-semibold text-slate-900">
          {data.reading.speed_kmh !== null ? `${data.reading.speed_kmh} km/h` : 'N/A'}
        </p>
      </div>
    </div>
  );
}

const FleetPage = () => {
  const { data: devices, isLoading, error } = useQuery({
    queryKey: ['fleet-devices'],
    queryFn: fleetAPI.getDevices,
  });

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

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading fleet...
        </div>
      )}

      {error && (
        <Card className="p-6 text-center">
          <Truck className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 font-medium text-slate-900">Unable to load fleet devices</p>
          <p className="text-sm text-slate-500">Check your connection and try again.</p>
        </Card>
      )}

      {!isLoading && !error && devices && devices.length === 0 && (
        <Card className="p-6 text-center text-slate-500">
          No devices registered yet.
        </Card>
      )}

      {/* Device Grid - Responsive - real devices + live telemetry */}
      {devices && devices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {devices.map((device) => (
            <Link key={device.device_id} to={`/fleet/${device.device_id}`}>
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {device.device_name}
                    </h3>
                    <Badge variant={getStatusVariant(device.status)}>
                      {device.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Device ID:</span>
                      <span className="font-medium text-slate-900">{device.device_id}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Hardware Tier:</span>
                      <span className="font-medium text-slate-900">Tier {device.hardware_tier}</span>
                    </div>

                    <div className="flex justify-between text-sm items-center">
                      <span className="text-slate-500">Subscription:</span>
                      {getSubscriptionBadge(device.subscription_status)}
                    </div>

                    <div className="flex justify-between text-sm items-center">
                      <span className="text-slate-500">Last Seen:</span>
                      <span className="font-medium text-slate-900 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatLastSeen(device.last_seen_at)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <FleetDeviceStats deviceId={device.device_id} />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default FleetPage;
