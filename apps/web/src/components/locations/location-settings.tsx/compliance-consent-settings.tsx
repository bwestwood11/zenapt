"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ShieldCheck } from "lucide-react"

export function ComplianceConsentSettings() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <CardTitle>Compliance & Consent Settings</CardTitle>
        </div>
        <CardDescription>Configure legal compliance, consent forms, and intake requirements</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between space-x-2 rounded-lg border border-border p-4">
          <div>
            <Label htmlFor="hipaa" className="cursor-pointer font-medium">
              HIPAA Consent Required
            </Label>
            <p className="text-sm text-muted-foreground">Clients must agree to HIPAA terms before booking</p>
          </div>
          <Switch id="hipaa" defaultChecked />
        </div>

        <div className="flex items-center justify-between space-x-2 rounded-lg border border-border p-4">
          <div>
            <Label htmlFor="intake-forms" className="cursor-pointer font-medium">
              Require Intake Forms
            </Label>
            <p className="text-sm text-muted-foreground">Must complete intake forms before first appointment</p>
          </div>
          <Switch id="intake-forms" defaultChecked />
        </div>

        <div className="flex items-center justify-between space-x-2 rounded-lg border border-border p-4">
          <div>
            <Label htmlFor="photo-consent" className="cursor-pointer font-medium">
              Photo Consent Required
            </Label>
            <p className="text-sm text-muted-foreground">Permission to take before/after photos</p>
          </div>
          <Switch id="photo-consent" />
        </div>

        <div className="flex items-center justify-between space-x-2 rounded-lg border border-border p-4">
          <div>
            <Label htmlFor="medical-questions" className="cursor-pointer font-medium">
              Medical Contraindication Questions
            </Label>
            <p className="text-sm text-muted-foreground">Display health screening questions during booking</p>
          </div>
          <Switch id="medical-questions" defaultChecked />
        </div>
      </CardContent>
    </Card>
  )
}
