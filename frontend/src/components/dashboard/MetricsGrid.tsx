import { Fuel, Gauge } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { formatNumber } from '../../lib/utils'
import type { HardwareTier } from '../../types/api'

interface MetricsGridProps {
  fuelLevel: number | null
  fuelCapacity: number
  speed: number | null
  hardwareTier: HardwareTier
}

export default function MetricsGrid({ 
  fuelLevel, 
  fuelCapacity, 
  speed,
  hardwareTier 
}: MetricsGridProps) {
  const fuelPercentage = fuelLevel ? (fuelLevel / fuelCapacity) * 100 : 0
  const hasFuelData = hardwareTier === 'Tier 3'
  const hasSpeedData = hardwareTier === 'Tier 2' || hardwareTier === 'Tier 3'

  return (
    <div className="space-y-6">
      {/* Fuel Level Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Fuel className="mr-2 h-5 w-5" />
            Fuel Level
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasFuelData ? (
            <>
              <div className="text-5xl font-bold">
                {formatNumber(fuelLevel || 0, 1)}
                <span className="text-2xl ml-2 text-muted-foreground">L</span>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500"
                    style={{ width: `${fuelPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{formatNumber(fuelPercentage, 1)}% of capacity</span>
                  <span>{formatNumber(fuelCapacity)} L</span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                Fuel monitoring not available
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Requires {hardwareTier === 'Tier 1' ? 'Tier 3' : 'Tier 3'} hardware
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Speed Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gauge className="mr-2 h-5 w-5" />
            Current Speed
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasSpeedData ? (
            <div className="text-center">
              <div className="text-6xl font-bold text-primary">
                {formatNumber(speed || 0, 1)}
              </div>
              <div className="text-2xl text-muted-foreground mt-2">km/h</div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                Speed monitoring not available
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Requires Tier 2 or Tier 3 hardware
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
