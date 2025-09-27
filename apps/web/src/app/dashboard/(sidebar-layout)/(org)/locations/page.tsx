import { LocationsGrid } from "@/components/locations/locations-grid";

export default function LocationsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-light text-foreground mb-6 text-balance">Your Locations</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Discover our premium med spa locations, each designed to provide you with exceptional wellness and beauty
            treatments in a serene environment.
          </p>
        </div>
        <LocationsGrid />
      </div>
    </main>
  )
}
