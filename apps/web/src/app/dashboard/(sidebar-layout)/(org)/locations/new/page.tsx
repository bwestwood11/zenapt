import NewLocationForm from "@/components/locations/new-location-form"
import { MapPin, Building2 } from "lucide-react"


export default function CreateLocationPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-primary mr-3" />
            <h1 className="text-3xl font-bold text-foreground">Add New Location</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Create a new med spa location for your booking management system
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground flex items-center mb-2">
                  <MapPin className="h-5 w-5 mr-2" />
                  Location Details
                </h2>
                <p className="text-muted-foreground">Fill in the information for your new med spa location</p>
              </div>

              <NewLocationForm />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Quick Tips</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Location Name</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose a name that clearly identifies this location to both staff and customers.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Time Zone</h4>
                  <p className="text-sm text-muted-foreground">
                    This automatically sets appointment times and business hours for this location.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Contact Info</h4>
                  <p className="text-sm text-muted-foreground">
                    These details will be used for booking confirmations and customer communications.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">What's Next?</h3>
              <p className="text-sm text-muted-foreground">After creating this location, you'll be able to:</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Set up services and pricing</li>
                <li>• Add staff members</li>
                <li>• Configure business hours</li>
                <li>• Enable online booking</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
