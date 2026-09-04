import { Truck, AlertTriangle, WifiOff, CheckCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { fleetAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const OverviewPage = () => {
  const { user } = useAuthStore();

  const { data: devices, isLoading, error } = useQuery({
    queryKey: ['fleet-devices'],
    queryFn: fleetAPI.getDevices,
    refetchInterval: 30000,
  });

  const stats = {
    total: devices?.length ?? 0,
    online: devices?.filter((d) => d.status === 'active').length ?? 0,
    warnings: devices?.filter((d) => d.status === 'maintenance').length ?? 0,
    offline: devices?.filter((d) => d.status === 'inactive').length ?? 0,
  };

  const metrics = [
    {
      label: 'Total Devices',
      value: stats.total,
      icon: Truck,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100'
    },
    {
      label: 'Online',
      value: stats.online,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Warnings',
      value: stats.warnings,
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      label: 'Offline',
      value: stats.offline,
      icon: WifiOff,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ];
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Overview: Fleet status for {user?.full_name ?? 'your fleet'}
        </h1>
        <p className="text-slate-500 mt-1">
          Real-time monitoring of your fleet devices
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading fleet overview...
        </div>
      )}

      {error && (
        <Card className="p-6 text-center">
          <Truck className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 font-medium text-slate-900">Unable to load fleet overview</p>
          <p className="text-sm text-slate-500">Check your connection and try again.</p>
        </Card>
      )}

      {/* Metrics Grid - Responsive */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">{metric.label}</p>
                    <p className="text-3xl font-bold text-slate-900">{metric.value}</p>
                  </div>
                  <div className={`${metric.bgColor} ${metric.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* System Status Card */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">System Status</h2>
        <div className="flex items-start gap-4">
          <div
            className={`w-3 h-3 rounded-full mt-1 animate-pulse ${
              stats.offline === 0 ? 'bg-green-500' : 'bg-yellow-500'
            }`}
          ></div>
          <div>
            <p className="font-medium text-slate-900">
              {stats.offline === 0
                ? 'RIS Compliance Tool Edge Network Operational'
                : `${stats.offline} device${stats.offline > 1 ? 's' : ''} offline`}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {stats.total > 0
                ? `${stats.online} of ${stats.total} devices actively reporting telemetry`
                : 'No devices registered yet'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OverviewPage;
