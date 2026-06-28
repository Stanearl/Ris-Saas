import { Truck, AlertTriangle, WifiOff, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getFleetStats } from '@/lib/mockData';

const OverviewPage = () => {
  const stats = getFleetStats();
  
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
          Overview: Fleet status for undefined
        </h1>
        <p className="text-slate-500 mt-1">
          Real-time monitoring of your fleet devices
        </p>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      
      {/* System Status Card */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">System Status</h2>
        <div className="flex items-start gap-4">
          <div className="w-3 h-3 bg-green-500 rounded-full mt-1 animate-pulse"></div>
          <div>
            <p className="font-medium text-slate-900">
              RIS Compliance Tool Edge Network Operational
            </p>
            <p className="text-sm text-slate-500 mt-1">
              All telemetry streams active
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OverviewPage;
