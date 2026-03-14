"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { DollarSign } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

export function PaymentBusinessSettings() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="size-5 text-primary" />
          <CardTitle>Payment & Business Settings</CardTitle>
        </div>
        <CardDescription>Configure pricing, taxes, tips, and payment options</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sales-tax">Sales Tax Rate (%)</Label>
            <Input id="sales-tax" type="number" defaultValue="8.5" min="0" max="100" step="0.1" />
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-lg border border-border p-4">
            <Label htmlFor="gift-cards" className="cursor-pointer">
              Gift Card Availability
            </Label>
            <Switch id="gift-cards" defaultChecked />
          </div>
        </div>

        {/* Gratuity Options */}
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <h3 className="font-semibold text-foreground">Gratuity Options (Preset Tip %)</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="tip-1">Option 1</Label>
              <div className="relative">
                <Input id="tip-1" type="number" defaultValue="15" min="0" max="100" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tip-2">Option 2</Label>
              <div className="relative">
                <Input id="tip-2" type="number" defaultValue="18" min="0" max="100" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tip-3">Option 3</Label>
              <div className="relative">
                <Input id="tip-3" type="number" defaultValue="20" min="0" max="100" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tip-4">Option 4</Label>
              <div className="relative">
                <Input id="tip-4" type="number" defaultValue="25" min="0" max="100" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Insurance Acceptance */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Insurance Acceptance</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {["BlueCross BlueShield", "Aetna", "Cigna", "UnitedHealthcare", "Medicare", "Medicaid"].map((insurance) => (
              <div key={insurance} className="flex items-center space-x-2">
                <Checkbox id={`insurance-${insurance}`} />
                <Label htmlFor={`insurance-${insurance}`} className="cursor-pointer text-sm font-normal">
                  {insurance}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
