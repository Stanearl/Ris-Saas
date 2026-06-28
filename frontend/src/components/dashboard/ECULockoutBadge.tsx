import { AlertOctagon } from 'lucide-react'
import { Card, CardContent } from '../ui/Card'

export default function ECULockoutBadge() {
  return (
    <Card className="border-2 border-red-500 bg-red-500/10 animate-pulse">
      <CardContent className="flex items-center justify-center p-6">
        <AlertOctagon className="h-8 w-8 text-red-500 mr-4" />
        <div>
          <h3 className="text-xl font-bold text-red-500">ECU THROTTLE ACTIVE</h3>
          <p className="text-sm text-red-400 mt-1">
            Engine throttle control is currently engaged due to overload condition
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
