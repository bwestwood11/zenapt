import { useMemo } from "react";
import { Check, ChevronsUpDown, Plus, Sparkles } from "lucide-react";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../ui/command";
import { cn } from "@/lib/utils";

interface AddOn {
  id: string;
  name: string;
  basePrice: number;
  incrementalDuration: number;
}

interface EmployeeService {
  id: string;
  addOns: AddOn[];
  serviceTerms: {
    id: string;
    name: string;
  };
}

interface AddOnSelectorProps {
  employeeServices: EmployeeService[] | undefined;
  selectedServiceIds: string[];
  selectedAddOnIds: string[];
  onSelectAddOns: (addOnIds: string[]) => void;
}

export const AddOnSelector = ({
  employeeServices,
  selectedServiceIds,
  selectedAddOnIds,
  onSelectAddOns,
}: AddOnSelectorProps) => {
  // Collect all unique add-ons from selected services
  const availableAddOns = useMemo(() => {
    if (!employeeServices || selectedServiceIds.length === 0) return [];

    const addOnsMap = new Map<string, AddOn>();

    selectedServiceIds.forEach((serviceId) => {
      const service = employeeServices.find((s) => s.id === serviceId);
      if (service?.addOns) {
        service.addOns.forEach((addOn) => {
          if (!addOnsMap.has(addOn.id)) {
            addOnsMap.set(addOn.id, addOn);
          }
        });
      }
    });

    return Array.from(addOnsMap.values());
  }, [employeeServices, selectedServiceIds]);

  const handleToggleAddOn = (addOnId: string) => {
    const updatedAddOnIds = selectedAddOnIds.includes(addOnId)
      ? selectedAddOnIds.filter((id) => id !== addOnId)
      : [...selectedAddOnIds, addOnId];

    onSelectAddOns(updatedAddOnIds);
  };

  if (availableAddOns.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Plus className="size-4 text-muted-foreground" />
        Add-Ons
        <span className="text-xs text-muted-foreground font-normal">
          (Optional)
        </span>
      </Label>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal bg-transparent"
          >
            <div className="flex items-center gap-2">
              {selectedAddOnIds.length > 0 ? (
                <>
                  {selectedAddOnIds.length} add-on
                  {selectedAddOnIds.length > 1 ? "s" : ""} selected
                </>
              ) : (
                <>
                  <Sparkles className="size-4 text-muted-foreground" />
                  Select Add-Ons
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
          <Command shouldFilter={true}>
            <CommandList className="max-h-60 overflow-y-auto">
              <CommandEmpty>
                No add-ons available for selected services
              </CommandEmpty>

              <CommandGroup>
                {availableAddOns.map((addOn) => (
                  <CommandItem
                    key={addOn.id}
                    value={addOn.id}
                    onSelect={() => handleToggleAddOn(addOn.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        selectedAddOnIds.includes(addOn.id)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />

                    <div className="flex flex-col">
                      <span className="font-medium">{addOn.name}</span>
                      <span className="text-xs text-muted-foreground">
                        +{addOn.incrementalDuration}min · $
                        {addOn.basePrice / 100}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
