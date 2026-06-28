import { Badge } from '../ui/Badge'
import type { HardwareTier } from '../../types/api'

interface DashboardHeaderProps {
  deviceId: string
  hardwareTier: HardwareTier
}

export default function DashboardHeader({ deviceId, hardwareTier }: DashboardHeaderProps) {
  const getTierColor = (tier: HardwareTier) => {
    switch (tier) {
      case 'Tier 3':
        return 'success'
      case 'Tier 2':
        return 'default'
      case 'Tier 1':
        return 'secondary'
      default:
        return 'default'
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{deviceId}</h2>
        <p className="text-sm text-muted-foreground mt-1">Live Vehicle Telemetry</p>
      </div>
      <Badge variant={getTierColor(hardwareTier)} className="text-base px-4 py-2">
        {hardwareTier}
      </Badge>
    </div>
  )
}
