"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Eye,
  BarChart3,
  Users,
  LayoutDashboard,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import type { AppRouter } from "../../../../server/src/routers";
import type { inferRouterOutputs } from "@trpc/server";
import Link from "next/link";

// Use the output type of the getAllLocations procedure
type Location = inferRouterOutputs<AppRouter>["location"]["getAllLocations"];

export function LocationsGrid() {
  const [selectedLocation, setSelectedLocation] = useState<
    Location[number] | null
  >(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: locations } = useQuery(
    trpc.location.getAllLocations.queryOptions()
  );

  const handleAddressClick = (location: Location[number]) => {
    const address = `${location.address}, ${location.city}, ${location.state} ${location.zipCode}, ${location.country}`;
    const encodedAddress = encodeURIComponent(address);
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
      "_blank"
    );
  };

  const handleViewDetails = (location: Location[number]) => {
    setSelectedLocation(location);
    setIsModalOpen(true);
  };

  if (!locations) {
    return <p></p>;
  }

  return (
    <>
      {locations.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-border bg-muted/30">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">No locations yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started by adding your first location
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
          {locations.map((location) => (
            <Card
              key={location.id}
              className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20"
            >
              <CardContent className="p-6 @container">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-medium text-foreground group-hover:text-primary transition-colors">
                      {location.name}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {location.timeZone}
                    </Badge>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleAddressClick(location)}
                      className="flex items-start gap-2 text-left hover:text-primary transition-colors group/address"
                    >
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground group-hover/address:text-primary" />
                      <div className="text-sm">
                        <div className="font-medium">{location.address}</div>
                        <div className="text-muted-foreground">
                          {location.city}, {location.state} {location.zipCode}
                        </div>
                        <div className="text-muted-foreground">
                          {location.country}
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <a
                      href={`mailto:${location.email}`}
                      className="flex items-center gap-2 text-sm hover:text-primary transition-colors group/email"
                    >
                      <Mail className="w-4 h-4 text-muted-foreground group-hover/email:text-primary" />
                      <span>{location.email}</span>
                    </a>

                    <a
                      href={`tel:${location.phoneNumber}`}
                      className="flex items-center gap-2 text-sm hover:text-primary transition-colors group/phone"
                    >
                      <Phone className="w-4 h-4 text-muted-foreground group-hover/phone:text-primary" />
                      <span>{location.phoneNumber}</span>
                    </a>
                  </div>

                  {/* View More Details button */}
                  <div className="pt-4 border-t flex gap-4 border-border/50  @max-sm:flex-col  ">
                    <Button
                      onClick={() => handleViewDetails(location)}
                      variant="outline"
                      className="flex-1 group/button hover:bg-primary hover:text-primary-foreground h-full transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View More Details
                    </Button>

                    <Link
                      className={buttonVariants({
                        className:
                          "flex-1 group/button hover:bg-primary hover:text-primary-foreground h-full transition-colors",
                      })}
                      href={`/dashboard/l/${location.slug}/`}
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Visit Dashboard
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal dialog for detailed view */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium text-primary">
              {selectedLocation?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedLocation && (
            <div className="space-y-6 py-4">
              {/* Location Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground border-b border-border/50 pb-2">
                    Location Information
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 mt-0.5 text-primary" />
                      <div>
                        <div className="font-medium">
                          {selectedLocation.address}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedLocation.city}, {selectedLocation.state}{" "}
                          {selectedLocation.zipCode}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedLocation.country}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-medium">Time Zone</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedLocation.timeZone}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-medium">Team Size</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedLocation._count.employees} employees
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-foreground border-b border-border/50 pb-2">
                    Contact Information
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-medium">Email</div>
                        <a
                          href={`mailto:${selectedLocation.email}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {selectedLocation.email}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-medium">Phone</div>
                        <a
                          href={`tel:${selectedLocation.phoneNumber}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {selectedLocation.phoneNumber}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-foreground border-b border-border/50 pb-2">
                  Location Map
                </h4>
                <div className="w-full h-64 bg-muted rounded-lg overflow-hidden">
                  <iframe
                    width="600"
                    height="450"
                    loading="lazy"
                    className="w-full h-full"
                    style={{ border: 0 }}
                    allowFullScreen={false}
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
    &q=${selectedLocation.address}`}
                  ></iframe>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-border/50">
                <Button className="flex-1">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
