import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import {
  Check,
  ChevronsUpDown,
  Plus,
  Sparkles,
  User,
  Loader2,
} from "lucide-react";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { cn } from "@/lib/utils";
import type { EmployeeService } from "../../../../server/prisma/generated/client";

interface ServiceSelectorProps {
  locationId: string;
  locationEmployeeId: string;
  selectedServiceIds: string[];
  onSelectServices: (serviceIds: string[]) => void;
}

export const ServiceSelector = ({
  locationId,
  locationEmployeeId,
  selectedServiceIds,
  onSelectServices,
}: ServiceSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: employeeServices, isLoading } = useQuery(
    trpc.services.getEmployeeServices.queryOptions(
      {
        locationEmployeeId,
        locationId,
      },
      {
        enabled: !!locationEmployeeId,
      },
    ),
  );

  const handleToggleService = (serviceId: string) => {
    const updatedServiceIds = selectedServiceIds.includes(serviceId)
      ? selectedServiceIds.filter((id) => id !== serviceId)
      : [...selectedServiceIds, serviceId];

    onSelectServices(updatedServiceIds);
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Sparkles className="size-4 text-muted-foreground" />
        Service
      </Label>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal bg-transparent"
          >
            <div className="flex items-center gap-2">
              {selectedServiceIds.length > 0 ? (
                <>
                  {selectedServiceIds.length} service
                  {selectedServiceIds.length > 1 ? "s" : ""} selected
                </>
              ) : (
                <>
                  <User className="size-4 text-muted-foreground" />
                  Add A Service
                </>
              )}
            </div>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          isInsideDialog={true}
          className="w-(--radix-popover-trigger-width) p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Search services by name..."
            />

            <CommandList className="max-h-60 overflow-y-auto">
              <CommandEmpty>
                {isLoading ? (
                  <ServiceLoadingSkeleton />
                ) : (
                  "No Service with this Name"
                )}
              </CommandEmpty>

              <CommandGroup>
                {employeeServices?.map((service) => (
                  <CommandItem
                    key={service.id}
                    value={service.id}
                    onSelect={() => handleToggleService(service.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        selectedServiceIds.includes(service.id)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />

                    <div className="flex flex-col">
                      <span className="font-medium">
                        {service.serviceTerms.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {service.duration}min · ${service.price / 100}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandItem>
                <Plus className="mr-2 size-4" />
                <div className="flex flex-col">
                  <span className="font-medium">
                    Create {searchQuery ? `"${searchQuery}"` : "new Service"}
                  </span>
                </div>
              </CommandItem>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const ServiceLoadingSkeleton = () => {
  return (
    <div className="p-2 space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-2 animate-pulse">
          <div className="size-4 bg-muted-foreground/20 rounded" />
          <div className="flex-1 space-y-1">
            <div className="h-4 bg-muted-foreground/20 rounded w-2/3" />
            <div className="h-3 bg-muted-foreground/20 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
};
