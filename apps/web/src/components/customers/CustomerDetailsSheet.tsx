"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  History,
  MessageSquare,
  BarChart3,
  Image,
  Crown,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  CalendarCheck,
  Percent,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomerDetailsSheetProps {
  customerId: string | null;
  locationId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerDetailsSheet({
  customerId,
  locationId,
  customerName,
  customerEmail,
  customerPhone,
  isOpen,
  onClose,
}: CustomerDetailsSheetProps) {
  const { data: customerDetails, isLoading: detailsLoading } = useQuery({
    ...trpc.customers.getCustomerDetails.queryOptions({
      customerId: customerId || "",
      locationId,
    }),
    enabled: !!customerId && isOpen,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    ...trpc.customers.getCustomerAnalytics.queryOptions({
      customerId: customerId || "",
      locationId,
    }),
    enabled: !!customerId && isOpen,
  });

  const isLoading = detailsLoading || analyticsLoading;

  const handleEmailClick = () => {
    const email = customerDetails?.email || customerEmail;
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  const handlePhoneClick = () => {
    const phone = customerDetails?.phoneNumber || customerPhone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[75vw] w-full overflow-y-auto px-6 sm:px-8">
        <SheetHeader className="space-y-4 pb-4">
          <SheetTitle className="text-2xl">Customer Details</SheetTitle>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-5 bg-primary/5 rounded-lg border border-primary/10">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                {isLoading ? (
                  <>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold">
                      {customerDetails?.firstName && customerDetails?.lastName
                        ? `${customerDetails.firstName} ${customerDetails.lastName}`
                        : customerName || "N/A"}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Customer ID: {customerId}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmailClick}
                disabled={
                  !customerDetails?.email &&
                  (!customerEmail || customerEmail === "N/A")
                }
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                {customerDetails?.email || customerEmail || "No email"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePhoneClick}
                disabled={
                  !customerDetails?.phoneNumber &&
                  (!customerPhone || customerPhone === "N/A")
                }
                className="flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                {customerDetails?.phoneNumber || customerPhone || "No phone"}
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Separator className="my-6" />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto gap-1">
            <TabsTrigger value="overview" className="text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="payment-methods" className="text-xs">
              Payment
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              History
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs">
              Messages
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="gallery" className="text-xs">
              Gallery
            </TabsTrigger>
            <TabsTrigger value="memberships" className="text-xs">
              Memberships
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs">
              Products
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Analytics Cards */}
            <div>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Customer Analytics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Appointments
                    </CardTitle>
                    <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className="text-2xl font-bold">
                        {analytics?.totalAppointments ?? 0}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Show Rate
                    </CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className="text-2xl font-bold">
                        {analytics?.showRate ?? 0}%
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Average Order Value
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <div className="text-2xl font-bold">
                        {formatCurrency(analytics?.aov ?? 0)}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Avg Revisit Value
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <div className="text-2xl font-bold">
                        {formatCurrency(analytics?.avgRevisitValue ?? 0)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Chart Section */}
            <div>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Appointment Trends (Last 12 Months)
              </h3>
              {analyticsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : analytics?.chartData && analytics.chartData.length > 0 ? (
                <div className="border rounded-lg p-4 bg-card">
                  <div className="space-y-4">
                    {analytics.chartData.map((data) => (
                      <div key={data.month} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{data.month}</span>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>{data.appointments} appointments</span>
                            <span>{formatCurrency(data.revenue)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min((data.appointments / Math.max(...analytics.chartData.map((d) => d.appointments))) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No appointment data available
                  </p>
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      Full Name
                    </p>
                    {detailsLoading ? (
                      <Skeleton className="h-4 w-48" />
                    ) : (
                      <p className="text-sm font-medium">
                        {customerDetails?.firstName && customerDetails?.lastName
                          ? `${customerDetails.firstName} ${customerDetails.lastName}`
                          : "N/A"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      Email Address
                    </p>
                    {detailsLoading ? (
                      <Skeleton className="h-4 w-48" />
                    ) : (
                      <p className="text-sm font-medium">
                        {customerDetails?.email || "N/A"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      Phone Number
                    </p>
                    {detailsLoading ? (
                      <Skeleton className="h-4 w-36" />
                    ) : (
                      <p className="text-sm font-medium">
                        {customerDetails?.phoneNumber || "N/A"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      Member Since
                    </p>
                    {detailsLoading ? (
                      <Skeleton className="h-4 w-32" />
                    ) : (
                      <p className="text-sm font-medium">
                        {customerDetails?.createdAt
                          ? formatDate(customerDetails.createdAt)
                          : "N/A"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payment-methods" className="mt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Payment Methods</h3>
              <p className="text-sm text-muted-foreground">
                No payment methods on file
              </p>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">History</h3>
              <p className="text-sm text-muted-foreground">
                No history available
              </p>
            </div>
          </TabsContent>

          <TabsContent value="messages" className="mt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Messages</h3>
              <p className="text-sm text-muted-foreground">No messages yet</p>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Analytics</h3>
              <p className="text-sm text-muted-foreground">
                No analytics data available
              </p>
            </div>
          </TabsContent>

          <TabsContent value="gallery" className="mt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Image className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Gallery</h3>
              <p className="text-sm text-muted-foreground">
                No images uploaded
              </p>
            </div>
          </TabsContent>

          <TabsContent value="memberships" className="mt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Crown className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Memberships</h3>
              <p className="text-sm text-muted-foreground">
                No active memberships
              </p>
            </div>
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Products</h3>
              <p className="text-sm text-muted-foreground">
                No products purchased
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
