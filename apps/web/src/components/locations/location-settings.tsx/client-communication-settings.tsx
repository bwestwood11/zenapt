"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ClientCommunicationSettings() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" />
          <CardTitle>Client Communication Settings</CardTitle>
        </div>
        <CardDescription>Configure automated reminders and custom message templates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reminder Timing */}
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="sms-reminder">SMS Reminder Timing</Label>
            <Select defaultValue="24">
              <SelectTrigger id="sms-reminder">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 hours before</SelectItem>
                <SelectItem value="24">24 hours before</SelectItem>
                <SelectItem value="48">48 hours before</SelectItem>
                <SelectItem value="72">3 days before</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-reminder">Email Reminder Timing</Label>
            <Select defaultValue="48">
              <SelectTrigger id="email-reminder">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 hours before</SelectItem>
                <SelectItem value="48">48 hours before</SelectItem>
                <SelectItem value="72">3 days before</SelectItem>
                <SelectItem value="168">1 week before</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="followup-timing">Follow-Up Message</Label>
            <Select defaultValue="24">
              <SelectTrigger id="followup-timing">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 hours after</SelectItem>
                <SelectItem value="24">24 hours after</SelectItem>
                <SelectItem value="48">48 hours after</SelectItem>
                <SelectItem value="72">3 days after</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom Message Templates */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Custom Message Templates</h3>
          <Tabs defaultValue="confirmation" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="confirmation">Confirmation</TabsTrigger>
              <TabsTrigger value="reminder">Reminder</TabsTrigger>
              <TabsTrigger value="cancellation">Cancellation</TabsTrigger>
              <TabsTrigger value="followup">Follow-Up</TabsTrigger>
            </TabsList>
            <TabsContent value="confirmation" className="space-y-2">
              <Label htmlFor="confirmation-template">Confirmation Message</Label>
              <Textarea
                id="confirmation-template"
                placeholder="Your appointment is confirmed for {date} at {time}..."
                rows={4}
                defaultValue="Hi {name}, your appointment is confirmed for {date} at {time} with {provider}. Reply CANCEL to cancel."
              />
            </TabsContent>
            <TabsContent value="reminder" className="space-y-2">
              <Label htmlFor="reminder-template">Reminder Message</Label>
              <Textarea
                id="reminder-template"
                placeholder="Reminder: Your appointment is tomorrow at {time}..."
                rows={4}
                defaultValue="Hi {name}, this is a reminder about your appointment tomorrow at {time} with {provider}."
              />
            </TabsContent>
            <TabsContent value="cancellation" className="space-y-2">
              <Label htmlFor="cancellation-template">Cancellation Message</Label>
              <Textarea
                id="cancellation-template"
                placeholder="Your appointment has been cancelled..."
                rows={4}
                defaultValue="Your appointment on {date} at {time} has been cancelled. Reply or call us to reschedule."
              />
            </TabsContent>
            <TabsContent value="followup" className="space-y-2">
              <Label htmlFor="followup-template">Follow-Up Message</Label>
              <Textarea
                id="followup-template"
                placeholder="Thank you for visiting us! We'd love your feedback..."
                rows={4}
                defaultValue="Thank you for visiting us, {name}! We hope you had a great experience. We'd love to hear your feedback."
              />
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  )
}
