"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Shield } from "lucide-react"

export function BookingCancellationSettings() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <CardTitle>Booking & Cancellation Rules</CardTitle>
        </div>
        <CardDescription>Define cancellation policies, fees, and booking requirements</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cancellation-timeframe">Cancellation Policy Timeframe</Label>
            <Select defaultValue="24">
              <SelectTrigger id="cancellation-timeframe">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 hours before</SelectItem>
                <SelectItem value="12">12 hours before</SelectItem>
                <SelectItem value="24">24 hours before</SelectItem>
                <SelectItem value="48">48 hours before</SelectItem>
                <SelectItem value="72">72 hours before</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="late-cancel-fee">Late Cancellation Fee</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input id="late-cancel-fee" type="number" defaultValue="25" min="0" step="5" className="pl-7" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="no-show-fee">No-Show Fee</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input id="no-show-fee" type="number" defaultValue="50" min="0" step="5" className="pl-7" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation-method">Confirmation Method</Label>
            <Select defaultValue="both">
              <SelectTrigger id="confirmation-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email Only</SelectItem>
                <SelectItem value="sms">SMS Only</SelectItem>
                <SelectItem value="both">Both Email & SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between space-x-2 rounded-lg border border-border p-4">
            <div>
              <Label htmlFor="auto-charge" className="cursor-pointer font-medium">
                Automatic Charge
              </Label>
              <p className="text-sm text-muted-foreground">Charge fees automatically</p>
            </div>
            <Switch id="auto-charge" defaultChecked />
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-lg border border-border p-4">
            <div>
              <Label htmlFor="card-required" className="cursor-pointer font-medium">
                Require Card on File
              </Label>
              <p className="text-sm text-muted-foreground">For all bookings</p>
            </div>
            <Switch id="card-required" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
