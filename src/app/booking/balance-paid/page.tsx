import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function BalancePaidPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Payment received</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Thanks — your balance payment was received. The photographer has
          been notified.
        </CardContent>
      </Card>
    </div>
  )
}
