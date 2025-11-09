import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { LayoutDashboard, MapPin } from "lucide-react";
import Link from "next/link";
import { redirect, RedirectType } from "next/navigation";
import React from "react";

// --- Centralized URL util ---
const getDashboardUrl = (type: "management" | "location", slug?: string) => {
  switch (type) {
    case "management":
      return "/dashboard/home";
    case "location":
      if (!slug)
        throw new Error("Location slug is required for location dashboard URL");
      return `/dashboard/l/${slug}`;
    default:
      throw new Error("Invalid dashboard type");
  }
};

// --- Main page ---
const Page = async () => {
  const { data: session } = await getSession();
  const user = session?.user;

  if (!user) redirect("/login");

  const hasManagementRole = Boolean(user.management?.role);
  const employees = user.employees ?? [];
  const employeeCount = employees.length;

  // Redirect management users with no employee locations
  if (hasManagementRole && employeeCount === 0)
    redirect(getDashboardUrl("management"));

  // Redirect employees with exactly one location and no management role
  if (!hasManagementRole && employeeCount === 1)
    redirect(getDashboardUrl("location", employees[0].locationSlug));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Greeting Section */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-balance mb-4">
            Welcome back, {user.name}
          </h1>
          <p className="text-lg text-muted-foreground">
            Access your management tools and locations from your dashboard
          </p>
        </div>

        {hasManagementRole ? (
          <Card className="mb-8 border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    Management Dashboard
                  </CardTitle>
                  <CardDescription className="text-base">
                    Access analytics, reports, and administrative controls
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href={getDashboardUrl("management")}>
                <Button size="lg" className="w-full sm:w-auto">
                  Go to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {employeeCount > 1 ? (
          <>
            {/* Locations Section */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2">Locations</h2>
              <p className="text-muted-foreground">
                View and manage all your business locations
              </p>
            </div>

            {/* Locations Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {employees.map((location) => (
                <Card
                  key={location.locationId}
                  className="hover:border-primary/50 transition-all hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-accent p-2.5 mt-1">
                        <MapPin className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl capitalize">
                          {location.locationSlug.replaceAll("-", " ")}
                        </CardTitle>
                        <CardDescription className="mt-1.5 capitalize">
                          {location.role === "ORGANIZATION_MANAGEMENT" ? "Admin" : location.role.replaceAll("_", " ").toLowerCase()}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link
                      href={getDashboardUrl("location", location.locationSlug)}
                    >
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                      >
                        View Location
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Page;
