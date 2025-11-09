import { SetBreadcrumbs } from "@/components/breadcrumbs";
import { LocationsGrid } from "@/components/locations/locations-grid";
import { BREADCRUMBS } from "@/hooks/breadcrumbs";
import { requirePermission } from "@/lib/permissions/permission";
import Link from "next/link";

export default async function LocationsPage() {
  await requirePermission(["READ::ADMIN_LOCATION"])
  
  return (
    <main className="min-h-screen bg-background">
      <SetBreadcrumbs items={BREADCRUMBS.dashboardLocations} />
      <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-16">
        <div className="text-left">
        <h1 className="text-4xl md:text-6xl font-light text-foreground mb-6 text-balance">Your Locations</h1>
        <p className="text-lg text-muted-foreground max-w-2xl text-pretty">
          Discover our premium med spa locations, each designed to provide you with exceptional wellness and beauty
          treatments in a serene environment.
        </p>
        </div>
        <Link
        href={"/dashboard/locations/new"}
        className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition"
        >
        Create New Location
        </Link>
      </div>
      <LocationsGrid />
      </div>
    </main>
  )
}
