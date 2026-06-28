import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import api from '@/lib/api';

interface WeightChartProps {
  deviceId: string;
}

interface TelemetryDataPoint {
  timestamp: string;
  weight_kg: number;
  latitude: number;
  longitude: number;
  fuel_level_liters?: number;
  speed_kmh?: number;
  ecu_throttle_active: boolean;
}

interface TelemetryHistoryResponse {
  device_id: string;
  start_time: string;
  end_time: string;
  data_points: TelemetryDataPoint[];
  count: number;
}

const WeightChart = ({ deviceId }: WeightChartProps) => {
  const { data: telemetryData, isLoading, error } = useQuery({
    queryKey: ['telemetry-history', deviceId],
    queryFn: async () => {
      const response = await api.get<{ status: string; data: TelemetryHistoryResponse }>(
        `/devices/${deviceId}/telemetry/history?hours=24`
      );
      return response.data.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Transform data for Recharts
  const chartData = telemetryData?.data_points.map(point => ({
    time: new Date(point.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    weight: point.weight_kg,
    timestamp: point.timestamp,
  })) || [];

  // Calculate dynamic Y-axis domain based on data
  const weights = chartData.map(d => d.weight);
  const minWeight = weights.length > 0 ? Math.min(...weights) : 0;
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 35000;
  const padding = (maxWeight - minWeight) * 0.1 || 1000;
  const yDomain = [
    Math.floor((minWeight - padding) / 1000) * 1000,
    Math.ceil((maxWeight + padding) / 1000) * 1000
  ];

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Weight Fluctuation (24h)
        </h3>
        <Skeleton className="w-full h-[300px]" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Weight Fluctuation (24h)
        </h3>
        <div className="flex items-center justify-center h-[300px] text-slate-500">
          <p>Failed to load telemetry data</p>
        </div>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Weight Fluctuation (24h)
        </h3>
        <div className="flex items-center justify-center h-[300px] text-slate-500">
          <p>No telemetry data available for the last 24 hours</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Weight Fluctuation (24h)
        <span className="text-sm font-normal text-slate-500 ml-2">
          ({telemetryData?.count} data points)
        </span>
      </h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="time" 
            stroke="#64748b"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            domain={yDomain}
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}t`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
            labelStyle={{ color: '#0f172a', fontWeight: 600 }}
            formatter={(value: any) => [`${Number(value).toLocaleString()} kg`, 'Weight']}
          />
          <Area 
            type="monotone" 
            dataKey="weight" 
            stroke="#fbbf24" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorWeight)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default WeightChart;
