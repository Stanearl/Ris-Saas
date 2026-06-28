import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LogOut, Truck } from 'lucide-react'
import { deviceAPI } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { getHardwareTier } from '../types/api'
import { SubscriptionLockout } from '../components/SubscriptionLockout'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import DashboardHeader from '../components/dashboard/DashboardHeader'
import WeightModule from '../components/dashboard/WeightModule'
import GPSMap from '../components/dashboard/GPSMap'
import MetricsGrid from '../components/dashboard/MetricsGrid'
import ECULockoutBadge from '../components/dashboard/ECULockoutBadge'
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton'

export default function DashboardPage() {
  const { user, clearAuth } = useAuthStore()
  const [deviceId] = useState('DEV-TRK-001') // In production, this would be selectable

  const { data, isLoading, error } = useQuery({
    queryKey: ['device-live', deviceId],
    queryFn: () => deviceAPI.getLiveData(deviceId),
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  const handleLogout = () => {
    clearAuth()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardSkeleton />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Truck className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="mt-4 text-2xl font-bold">No Data Available</h2>
          <p className="mt-2 text-muted-foreground">
            Unable to load vehicle telemetry data
          </p>
          <Button onClick={handleLogout} variant="outline" className="mt-4">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    )
  }

  const hardwareTier = getHardwareTier(data.reading)
  const legalLimit = 15000 // In production, this would come from device config

  return (
    <>
      <SubscriptionLockout />
      <div className="min-h-screen bg-background">
        {/* Top Navigation */}
        <nav className="border-b border-border bg-card">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">RISAFRICA SYSTEMS</h1>
                <p className="text-xs text-muted-foreground">Compliance Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user?.full_name}</p>
                <Badge 
                  variant={user?.subscription_status === 'active' ? 'success' : 'warning'}
                  className="text-xs"
                >
                  {user?.subscription_status}
                </Badge>
              </div>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </nav>

        {/* Main Dashboard */}
        <main className="container mx-auto p-4 space-y-6">
          <DashboardHeader 
            deviceId={data.device_id} 
            hardwareTier={hardwareTier}
          />

          <WeightModule
            currentWeight={data.reading.weight_kg}
            legalLimit={legalLimit}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <GPSMap
              latitude={data.reading.latitude}
              longitude={data.reading.longitude}
            />
            <MetricsGrid
              fuelLevel={data.reading.fuel_level_liters}
              fuelCapacity={400} // In production, from device config
              speed={data.reading.speed_kmh}
              hardwareTier={hardwareTier}
            />
          </div>

          {data.reading.ecu_throttle_active && <ECULockoutBadge />}
        </main>
      </div>
    </>
  )
}
