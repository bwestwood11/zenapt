"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Palette, Upload, MapPin } from "lucide-react"

export function BrandingDisplaySettings() {
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="size-5 text-primary" />
          <CardTitle>Branding & Display Settings</CardTitle>
        </div>
        <CardDescription>Customize location branding, logos, and visitor information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-3">
          <Label htmlFor="logo-upload">Location Logo</Label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <div className="size-24 overflow-hidden rounded-lg border border-border">
                <img src={logoPreview || "/placeholder.svg"} alt="Logo preview" className="size-full object-cover" />
              </div>
            ) : (
              <div className="flex size-24 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted">
                <Upload className="size-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <Button variant="outline" asChild>
                <label htmlFor="logo-upload" className="cursor-pointer">
                  <Upload className="mr-2 size-4" />
                  Upload Logo
                </label>
              </Button>
              <Input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
            </div>
          </div>
        </div>

        {/* WiFi & Location Info */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wifi-name">WiFi Network Name</Label>
            <Input id="wifi-name" placeholder="Guest WiFi" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wifi-password">WiFi Password</Label>
            <Input id="wifi-password" type="password" placeholder="Enter password" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="parking-instructions">Parking Instructions</Label>
          <Textarea
            id="parking-instructions"
            placeholder="Parking is available in the rear of the building..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="arrival-notes">Arrival Notes</Label>
          <Textarea id="arrival-notes" placeholder="Please check in at the front desk when you arrive..." rows={3} />
        </div>

        {/* Google Maps */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" />
            <Label htmlFor="maps-link">Google Maps Link / Directions</Label>
          </div>
          <Input id="maps-link" type="url" placeholder="https://maps.google.com/..." />
        </div>

        {/* Map Preview */}
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex h-48 items-center justify-center bg-muted">
            <MapPin className="size-12 text-muted-foreground" />
          </div>
          <div className="bg-card p-3 text-center text-sm text-muted-foreground">
            Google Maps embed preview will appear here
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
