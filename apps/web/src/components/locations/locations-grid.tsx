"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  timeZone: string;
  email: string;
  phone: string;
  employeeCount: number;
  image?: string;
}

const locations: Location[] = [
  {
    id: "1",
    name: "Serenity Spa Downtown",
    address: "123 Wellness Boulevard",
    city: "Beverly Hills",
    state: "California",
    country: "United States",
    zipCode: "90210",
    timeZone: "PST (UTC-8)",
    email: "downtown@serenityspa.com",
    phone: "+1 (555) 123-4567",
    employeeCount: 24,
  },
  {
    id: "2",
    name: "Tranquil Waters Med Spa",
    address: "456 Harmony Street",
    city: "Manhattan",
    state: "New York",
    country: "United States",
    zipCode: "10001",
    timeZone: "EST (UTC-5)",
    email: "manhattan@tranquilwaters.com",
    phone: "+1 (555) 234-5678",
    employeeCount: 18,
  },
  {
    id: "3",
    name: "Radiance Wellness Center",
    address: "789 Beauty Lane",
    city: "Miami",
    state: "Florida",
    country: "United States",
    zipCode: "33101",
    timeZone: "EST (UTC-5)",
    email: "miami@radiancewellness.com",
    phone: "+1 (555) 345-6789",
    employeeCount: 32,
  },
  {
    id: "4",
    name: "Zen Garden Med Spa",
    address: "321 Peaceful Drive",
    city: "Austin",
    state: "Texas",
    country: "United States",
    zipCode: "73301",
    timeZone: "CST (UTC-6)",
    email: "austin@zengarden.com",
    phone: "+1 (555) 456-7890",
    employeeCount: 15,
  },
  {
    id: "5",
    name: "Luxe Aesthetics Studio",
    address: "654 Elegance Avenue",
    city: "Seattle",
    state: "Washington",
    country: "United States",
    zipCode: "98101",
    timeZone: "PST (UTC-8)",
    email: "seattle@luxeaesthetics.com",
    phone: "+1 (555) 567-8901",
    employeeCount: 21,
  },
  {
    id: "6",
    name: "Pure Bliss Wellness",
    address: "987 Rejuvenation Road",
    city: "Denver",
    state: "Colorado",
    country: "United States",
    zipCode: "80201",
    timeZone: "MST (UTC-7)",
    email: "denver@purebliss.com",
    phone: "+1 (555) 678-9012",
    employeeCount: 28,
  },
];

export function LocationsGrid() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddressClick = (location: Location) => {
    const address = `${location.address}, ${location.city}, ${location.state} ${location.zipCode}, ${location.country}`;
    const encodedAddress = encodeURIComponent(address);
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
      "_blank"
    );
  };

  const handleViewDetails = (location: Location) => {
    setSelectedLocation(location);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {locations.map((location) => (
          <Card
            key={location.id}
            className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20"
          >
            <CardContent className="p-6">
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
                    href={`tel:${location.phone}`}
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors group/phone"
                  >
                    <Phone className="w-4 h-4 text-muted-foreground group-hover/phone:text-primary" />
                    <span>{location.phone}</span>
                  </a>
                </div>

                {/* View More Details button */}
                <div className="pt-4 border-t border-border/50">
                  <Button
                    onClick={() => handleViewDetails(location)}
                    variant="outline"
                    size="sm"
                    className="w-full group/button hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View More Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                          {selectedLocation.employeeCount} employees
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
                          href={`tel:${selectedLocation.phone}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {selectedLocation.phone}
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
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d269219.9760428484!2d-82.61908911570814!3d27.992267946874943!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88c2b782b3b9d1e1%3A0xa75f1389af96b463!2sTampa%2C%20FL%2C%20USA!5e1!3m2!1sen!2sin!4v1758207128114!5m2!1sen!2sin"
                    width="600"
                    height="450"
                    className="w-full h-full"
                    style={{ border: 0 }}
                    allowFullScreen={false}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border/50">
                <Button
                  onClick={() => handleAddressClick(selectedLocation)}
                  variant="outline"
                  className="flex-1"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Open in Google Maps
                </Button>
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
