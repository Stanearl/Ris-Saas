import { useEffect, useRef } from 'react'
import { Scale, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { formatNumber, formatWeightKg } from '../../lib/utils'
import { cn } from '../../lib/utils'

interface WeightModuleProps {
  currentWeight: number
  legalLimit: number
}

export default function WeightModule({ currentWeight, legalLimit }: WeightModuleProps) {
  const percentage = (currentWeight / legalLimit) * 100
  const isOverloaded = currentWeight > legalLimit
  const isNearLimit = percentage > 90 && !isOverloaded
  const prevOverloadedRef = useRef(isOverloaded)

  // Show toast notification when overload status changes
  useEffect(() => {
    if (isOverloaded && !prevOverloadedRef.current) {
      toast.error('⚠️ VEHICLE OVERLOADED', {
        description: `Exceeds legal limit by ${formatWeightKg(currentWeight - legalLimit)} kg. Immediate action required!`,
        duration: 8000,
      })
    } else if (isNearLimit && !prevOverloadedRef.current && !isOverloaded) {
      toast.warning('⚠️ Approaching Weight Limit', {
        description: `Vehicle is at ${formatNumber(percentage, 1)}% of legal limit`,
        duration: 5000,
      })
    }
    prevOverloadedRef.current = isOverloaded
  }, [isOverloaded, isNearLimit, currentWeight, legalLimit, percentage])

  return (
    <Card className={cn(
      "border-2 transition-all duration-500",
      isOverloaded && "border-red-500 bg-red-500/5",
      isNearLimit && "border-yellow-500 bg-yellow-500/5"
    )}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Scale className="mr-2 h-6 w-6" />
            Gross Combination Weight
          </span>
          {isOverloaded && (
            <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className={cn(
            "text-7xl font-black tracking-tighter transition-colors duration-500",
            isOverloaded && "text-red-500",
            isNearLimit && "text-yellow-500",
            !isOverloaded && !isNearLimit && "text-primary"
          )}>
            {formatWeightKg(currentWeight)}
            <span className="text-4xl ml-2 text-muted-foreground">kg</span>
          </div>
          <div className="mt-4 text-2xl text-muted-foreground">
            Legal Limit: {formatWeightKg(legalLimit)} kg
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full transition-all duration-500",
                isOverloaded && "bg-red-500",
                isNearLimit && "bg-yellow-500",
                !isOverloaded && !isNearLimit && "bg-primary"
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {formatNumber(percentage, 1)}% of limit
            </span>
            {isOverloaded && (
              <span className="font-bold text-red-500">
                OVERLOADED by {formatWeightKg(currentWeight - legalLimit)} kg
              </span>
            )}
          </div>
        </div>

        {/* Status Message */}
        {isOverloaded && (
          <div className="rounded-lg bg-red-500/10 border border-red-500 p-4 text-center">
            <p className="font-bold text-red-500">⚠️ VEHICLE OVERLOADED</p>
            <p className="text-sm text-red-400 mt-1">
              Exceeds legal weight limit. Immediate action required.
            </p>
          </div>
        )}
        {isNearLimit && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500 p-4 text-center">
            <p className="font-bold text-yellow-500">⚠️ APPROACHING LIMIT</p>
            <p className="text-sm text-yellow-400 mt-1">
              Vehicle weight is near legal limit.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
