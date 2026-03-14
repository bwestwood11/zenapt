"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Edit, Clock, DollarSign, Loader2 } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../../../../../../server/src/routers";

type AvailableServiceTerm =
  inferRouterOutputs<AppRouter>["services"]["getAvailableServiceTerms"][number];

const isMultipleOfFive = (value: number) => value % 5 === 0;

interface MyServicesClientProps {
  locationId: string;
}

export default function MyServicesClient({ locationId }: MyServicesClientProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Get my services
  const { data: myServices, isLoading: isLoadingServices, refetch: refetchServices } = useQuery(
    trpc.services.getMyServices.queryOptions({ locationId })
  );

  // Get available service terms
  const { data: availableServiceTerms } = useQuery(
    trpc.services.getAvailableServiceTerms.queryOptions({ locationId })
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Services</h1>
            <p className="text-muted-foreground mt-1">
              Configure the services you offer and set your pricing
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Service
              </Button>
            </DialogTrigger>
            <AddServiceDialog
              locationId={locationId}
              availableServiceTerms={availableServiceTerms ?? []}
              onSuccess={() => {
                setIsAddDialogOpen(false);
                refetchServices();
              }}
            />
          </Dialog>
        </div>
      </div>

      {/* Services Grid */}
      {isLoadingServices ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {myServices && myServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  locationId={locationId}
                  onUpdate={refetchServices}
                />
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent className="pt-6">
                <p className="text-muted-foreground mb-4">
                  You haven't configured any services yet
                </p>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Service
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  locationId,
  onUpdate,
}: {
  service: any;
  locationId: string;
  onUpdate: () => void;
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isActive, setIsActive] = useState(service.isActive);

  const updateMutation = useMutation(
    trpc.services.updateMyService.mutationOptions({
      onSuccess: () => {
        toast.success("Service updated successfully");
        onUpdate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update service");
      },
    })
  );

  const handleToggleActive = async (checked: boolean) => {
    setIsActive(checked);
    updateMutation.mutate({
      serviceId: service.id,
      isActive: checked,
      locationId,
    });
  };

  return (
    <Card className={isActive ? "" : "opacity-60"}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{service.serviceTerms.name}</CardTitle>
            {service.serviceTerms.serviceGroup && (
              <Badge variant="secondary" className="mt-2">
                {service.serviceTerms.serviceGroup.name}
              </Badge>
            )}
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={handleToggleActive}
            disabled={updateMutation.isPending}
          />
        </div>
        <CardDescription className="line-clamp-2">
          {service.serviceTerms.excerpt || service.serviceTerms.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Price</span>
            </div>
            <p className="text-lg font-semibold">
              ${(service.price / 100).toFixed(2)}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Duration</span>
            </div>
            <p className="text-lg font-semibold">{service.duration} min</p>
          </div>
        </div>

        {(service.prepTime > 0 || service.bufferTime > 0) && (
          <div className="text-sm text-muted-foreground pt-2 border-t">
            {service.prepTime > 0 && (
              <p>Prep time: {service.prepTime} min</p>
            )}
            {service.bufferTime > 0 && (
              <p>Buffer time: {service.bufferTime} min</p>
            )}
          </div>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <Edit className="h-4 w-4" />
              Edit Service
            </Button>
          </DialogTrigger>
          <EditServiceDialog
            service={service}
            locationId={locationId}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              onUpdate();
            }}
          />
        </Dialog>
      </CardContent>
    </Card>
  );
}

function AddServiceDialog({
  locationId,
  availableServiceTerms,
  onSuccess,
}: {
  locationId: string;
  availableServiceTerms: AvailableServiceTerm[];
  onSuccess: () => void;
}) {
  const [selectedServiceTermId, setSelectedServiceTermId] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [prepTime, setPrepTime] = useState("0");
  const [bufferTime, setBufferTime] = useState("0");

  const selectedServiceTerm = availableServiceTerms.find(
    (st) => st.id === selectedServiceTermId
  );

  useEffect(() => {
    if (selectedServiceTerm) {
      setPrice((selectedServiceTerm.minimumPrice / 100).toString());
    } else {
      setPrice("");
    }
  }, [selectedServiceTermId, availableServiceTerms]);

  const createMutation = useMutation(
    trpc.services.createMyService.mutationOptions({
      onSuccess: () => {
        toast.success("Service added successfully");
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add service");
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedServiceTermId || !price || !duration) {
      toast.error("Please fill in all required fields");
      return;
    }

    const parsedDuration = Number.parseInt(duration, 10);
    const parsedPrepTime = Number.parseInt(prepTime, 10);
    const parsedBufferTime = Number.parseInt(bufferTime, 10);

    if (
      !isMultipleOfFive(parsedDuration) ||
      !isMultipleOfFive(parsedPrepTime) ||
      !isMultipleOfFive(parsedBufferTime)
    ) {
      toast.error("Duration, prep time, and buffer time must be in 5-minute increments");
      return;
    }

    createMutation.mutate({
      serviceTermId: selectedServiceTermId,
      price: Math.round(Number.parseFloat(price) * 100), // Convert to cents
      duration: parsedDuration,
      prepTime: parsedPrepTime,
      bufferTime: parsedBufferTime,
      locationId,
    });
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Add Service</DialogTitle>
        <DialogDescription>
          Select a service and configure your pricing and duration
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="service">Service *</Label>
          <Select value={selectedServiceTermId} onValueChange={setSelectedServiceTermId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a service" />
            </SelectTrigger>
            <SelectContent>
              {availableServiceTerms.map((serviceTerm) => (
                <SelectItem key={serviceTerm.id} value={serviceTerm.id}>
                  {serviceTerm.name}
                  {serviceTerm.serviceGroup && 
                    ` - ${serviceTerm.serviceGroup.name}`
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedServiceTerm && (
            <p className="text-sm text-muted-foreground">
              Minimum price: ${(selectedServiceTerm.minimumPrice / 100).toFixed(2)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price (USD) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                step="0.01"
                min={selectedServiceTerm ? selectedServiceTerm.minimumPrice / 100 : 0}
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (min) *</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="duration"
                type="number"
                min="5"
                step="5"
                placeholder="60"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="prepTime">Prep Time (min)</Label>
            <Input
              id="prepTime"
              type="number"
              min="0"
              step="5"
              placeholder="0"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bufferTime">Buffer Time (min)</Label>
            <Input
              id="bufferTime"
              type="number"
              min="0"
              step="5"
              placeholder="0"
              value={bufferTime}
              onChange={(e) => setBufferTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Service"
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditServiceDialog({
  service,
  locationId,
  onSuccess,
}: {
  service: any;
  locationId: string;
  onSuccess: () => void;
}) {
  const [price, setPrice] = useState((service.price / 100).toString());
  const [duration, setDuration] = useState(service.duration.toString());
  const [prepTime, setPrepTime] = useState(service.prepTime.toString());
  const [bufferTime, setBufferTime] = useState(service.bufferTime.toString());

  const updateMutation = useMutation(
    trpc.services.updateMyService.mutationOptions({
      onSuccess: () => {
        toast.success("Service updated successfully");
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update service");
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedDuration = Number.parseInt(duration, 10);
    const parsedPrepTime = Number.parseInt(prepTime, 10);
    const parsedBufferTime = Number.parseInt(bufferTime, 10);

    if (
      !isMultipleOfFive(parsedDuration) ||
      !isMultipleOfFive(parsedPrepTime) ||
      !isMultipleOfFive(parsedBufferTime)
    ) {
      toast.error("Duration, prep time, and buffer time must be in 5-minute increments");
      return;
    }

    updateMutation.mutate({
      serviceId: service.id,
      price: Math.round(Number.parseFloat(price) * 100),
      duration: parsedDuration,
      prepTime: parsedPrepTime,
      bufferTime: parsedBufferTime,
      locationId,
    });
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Edit Service</DialogTitle>
        <DialogDescription>
          Update your pricing and duration for {service.serviceTerms.name}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Service</Label>
          <p className="text-sm font-medium">{service.serviceTerms.name}</p>
          <p className="text-sm text-muted-foreground">
            Minimum price: ${(service.serviceTerms.minimumPrice / 100).toFixed(2)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-price">Price (USD) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                min={service.serviceTerms.minimumPrice / 100}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-duration">Duration (min) *</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="edit-duration"
                type="number"
                min="5"
                step="5"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-prepTime">Prep Time (min)</Label>
            <Input
              id="edit-prepTime"
              type="number"
              min="0"
              step="5"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-bufferTime">Buffer Time (min)</Label>
            <Input
              id="edit-bufferTime"
              type="number"
              min="0"
              step="5"
              value={bufferTime}
              onChange={(e) => setBufferTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="w-full"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Service"
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
