import { useState, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { useQueryState } from "nuqs";
import { Check, ChevronsUpDown, Plus, User, Loader2 } from "lucide-react";
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
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/src/routers";

type Customer =
  inferRouterOutputs<AppRouter>["appointment"]["getCustomersForAppointment"]["customers"][number];

interface CustomerSelectorProps {
  locationId: string;
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
}

export const CustomerSelector = ({
  locationId,
  selectedCustomer,
  onSelectCustomer,
}: CustomerSelectorProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useQueryState("customer_search");

  const {
    data: customersResponse,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery(
    trpc.appointment.getCustomersForAppointment.infiniteQueryOptions(
      { locationId, search: searchQuery, limit: 10 },
      {
        getNextPageParam: (data) => data.nextCursor,
      },
    ),
  );

  const customers = useMemo(
    () => customersResponse?.pages.flatMap((page) => page.customers) || [],
    [customersResponse],
  );

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isNearBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 100;

    if (isNearBottom && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    setIsPopoverOpen(false);
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <User className="size-4 text-muted-foreground" />
        Customer
      </Label>

      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal bg-transparent"
          >
            <div className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              {selectedCustomer ? (
                <span>{selectedCustomer.user.name}</span>
              ) : (
                <span className="text-muted-foreground">
                  Select a customer...
                </span>
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
              value={searchQuery || ""}
              onValueChange={setSearchQuery}
              placeholder="Search customers by name or email..."
            />

            <CommandList
              onScroll={handleScroll}
              className="max-h-60 overflow-y-auto"
            >
              <CommandEmpty>
                {isLoading || isFetchingNextPage ? (
                  <LoadingSkeleton />
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">
                    No customers found
                  </div>
                )}
              </CommandEmpty>

              <CommandGroup>
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={`${customer.user.name} ${customer.user.email}`}
                    onSelect={() => handleSelectCustomer(customer)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        selectedCustomer?.id === customer.id
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />

                    <div className="flex flex-col">
                      <span className="font-medium">{customer.user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {customer.user.email} · {customer.phoneNumber}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandItem>
                <Plus className="mr-2 size-4" />
                <div className="flex flex-col">
                  <span className="font-medium">
                    Create {searchQuery ? `"${searchQuery}"` : "new Customer"}
                  </span>
                </div>
              </CommandItem>

              {isFetchingNextPage && <LoadingMoreIndicator />}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const LoadingSkeleton = () => {
  return (
    <div className="p-2 space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-2 animate-pulse">
          <div className="size-4 bg-muted-foreground/20 rounded" />
          <div className="flex-1 space-y-1">
            <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
            <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

const LoadingMoreIndicator = () => {
  return (
    <div className="flex items-center justify-center gap-2 p-3 border-t bg-muted/30">
      <Loader2 className="size-4 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">
        Loading more customers...
      </span>
    </div>
  );
};
