import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Gauge } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getDeviceById } from '@/lib/mockData';
import TruckSchematic from '@/components/device/TruckSchematic';
import WeightChart from '@/components/device/WeightChart';
import DeviceMap from '@/components/device/DeviceMap';

const DeviceDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const device = getDeviceById(id || '');
  
  if (!device) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-900">Device not found</h2>
        <Link to="/fleet" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Fleet
        </Link>
      </div>
    );
  }
  
  const loadPercentage = (device.weight.current / device.weight.limit) * 100;
  const headroom = device.weight.limit - device.weight.current;
  const isNearLimit = loadPercentage > 90;
  const isOverLimit = loadPercentage > 100;
  
  const getLoadBarColor = () => {
    if (isOverLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const getStatusColor = () => {
    if (isOverLimit) return 'text-red-600';
    if (isNearLimit) return 'text-yellow-600';
    return 'text-green-600';
  };
  
  const getStatusText = () => {
    if (isOverLimit) return 'OVER LIMIT';
    if (isNearLimit) return 'APPROACHING LIMIT';
    return 'WITHIN LIMITS';
  };
  
  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const fuelPercentage = (device.fuel.current / device.fuel.capacity) * 100;
  
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link to="/fleet">
        <Button variant="outline" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Fleet
        </Button>
      </Link>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{device.name}</h1>
          <p className="text-slate-500 mt-1">{device.deviceId}</p>
        </div>
        <Badge variant={device.status === 'online' ? 'success' : device.status === 'warning' ? 'warning' : 'destructive'}>
          {device.status.toUpperCase()}
        </Badge>
      </div>
      
      {/* Hardware Schematic */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Active Hardware Schematic</h2>
          <Badge variant="default">Tier {device.hardwareTier}</Badge>
        </div>
        <TruckSchematic tier={device.hardwareTier} />
      </Card>
      
      {/* Middle Section - Weight Display and Configuration - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Left: Master CAN Display */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-slate-600 mb-2">
            MASTER CAN DISPLAY - GROSS COMBINATION WEIGHT
          </h3>
          <div className="text-center py-8">
            <div className="text-7xl font-black text-slate-900 mb-4">
              {device.weight.current.toLocaleString()}
              <span className="text-3xl ml-2 text-slate-600">KG</span>
            </div>
            
            {/* Load Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm text-slate-600 mb-2">
                <span>Load Progress</span>
                <span>{loadPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full ${getLoadBarColor()} transition-all duration-500`}
                  style={{ width: `${Math.min(loadPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0 kg</span>
                <span>{device.weight.limit.toLocaleString()} kg</span>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Right: Device Configuration */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Device Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Legal Load Limit (kg)
              </label>
              <Input
                type="number"
                value={device.weight.limit}
                readOnly
                className="bg-slate-50"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Active Limit
              </label>
              <Input
                type="text"
                value={`${device.weight.limit.toLocaleString()} kg`}
                readOnly
                className="bg-slate-50"
              />
            </div>
            
            <div className="pt-4 border-t border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Status:</span>
                <span className={`text-sm font-bold ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Headroom:</span>
                <span className="text-sm font-semibold text-slate-900">
                  {headroom.toLocaleString()} kg
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Lower Middle Section - Map and Fuel/Speed - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Left: GPS Map */}
        <DeviceMap device={device} />
        
        {/* Right: Fuel and Speed */}
        <div className="space-y-6">
          {/* Fuel Level */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Live Fuel Level
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Current Level:</span>
                <span className="font-semibold text-slate-900">
                  {device.fuel.current}L / {device.fuel.capacity}L
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${fuelPercentage}%` }}
                />
              </div>
              <div className="text-right text-xs text-slate-500">
                {fuelPercentage.toFixed(1)}% capacity
              </div>
            </div>
          </Card>
          
          {/* Speed Display */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Speed</h3>
            <div className="flex items-center justify-center py-4">
              <Gauge className="w-12 h-12 text-blue-600 mr-4" />
              <div>
                <div className="text-5xl font-bold text-slate-900">
                  {device.speed}
                  <span className="text-2xl ml-2 text-slate-600">km/h</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-sm">
              <span className="text-slate-600">Last Frame:</span>
              <span className="font-medium text-slate-900 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatLastSeen(device.lastSeen)}
              </span>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Bottom Section - Weight Chart */}
      <WeightChart deviceId={device.id} />
    </div>
  );
};

export default DeviceDetailsPage;
