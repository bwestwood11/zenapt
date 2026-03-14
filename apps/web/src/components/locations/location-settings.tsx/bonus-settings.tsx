"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Sparkles } from "lucide-react"

export function BonusSettings() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <CardTitle>Advanced Features</CardTitle>
        </div>
        <CardDescription>Optional premium features to enhance your location management</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex items-center justify-between space-x-2 rounded-lg border border-border bg-card p-4">
            <div>
              <Label htmlFor="wait-time" className="cursor-pointer font-medium">
                Display Estimated Wait Time
              </Label>
              <p className="text-sm text-muted-foreground">Show real-time wait estimates</p>
            </div>
            <Switch id="wait-time" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avg-duration">Average Appointment Duration</Label>
            <Select defaultValue="auto">
              <SelectTrigger id="avg-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-calculated</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred-language">Preferred Communication Language</Label>
            <Select defaultValue="en">
              <SelectTrigger id="preferred-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-lg border border-border bg-card p-4">
            <div>
              <Label htmlFor="multi-location" className="cursor-pointer font-medium">
                Multi-Location Sync
              </Label>
              <p className="text-sm text-muted-foreground">Share settings across locations</p>
            </div>
            <Switch id="multi-location" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
