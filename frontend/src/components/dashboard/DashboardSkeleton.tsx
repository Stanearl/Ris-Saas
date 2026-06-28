import { Skeleton } from '../ui/Skeleton'
import { Card, CardContent, CardHeader } from '../ui/Card'

export default function DashboardSkeleton() {
  return (
    <>
      {/* Nav Skeleton */}
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </nav>

      <main className="container mx-auto p-4 space-y-6">
        {/* Header Skeleton */}
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>

        {/* Weight Module Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <Skeleton className="h-20 w-64 mx-auto" />
              <Skeleton className="h-6 w-48 mx-auto" />
            </div>
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>

        {/* Grid Skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="h-[400px]">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[320px] w-full" />
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-32 mx-auto" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  )
}
