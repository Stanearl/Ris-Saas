import { useEffect, useState } from 'react'
import { CreditCard, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'

export function SubscriptionLockout() {
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    const handleLockout = () => {
      setIsLocked(true)
    }

    window.addEventListener('subscription-lockout', handleLockout)
    return () => window.removeEventListener('subscription-lockout', handleLockout)
  }, [])

  if (!isLocked) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <Card className="w-full max-w-md border-destructive">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Subscription Required</CardTitle>
          <CardDescription className="text-base">
            Your subscription has expired or payment is past due
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            To continue accessing the Compliance Dashboard, please update your payment method
            through Paystack to restore your subscription.
          </p>
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => {
              // In production, this would redirect to Paystack payment page
              window.location.href = 'https://paystack.com/pay/risafrica-subscription'
            }}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Update Payment Method
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              localStorage.removeItem('risafrica-auth-storage')
              window.location.href = '/login'
            }}
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
