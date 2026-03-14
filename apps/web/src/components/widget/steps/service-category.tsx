"use client";

import { CheckCircle2 } from "lucide-react";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { cn } from "@/lib/utils";
import { useCheckoutStore, useWatchCart } from "../hooks/useStore";
import { Skeleton } from "@/components/ui/skeleton";

const ServiceCategory = () => {
  const { location, step, updateCartItem } = useCheckoutStore();
  const currentCart = useWatchCart();

  const { data: serviceGroups, isLoading } = useQuery(
    trpc.public.getServicesByLocation.queryOptions(
      { locationId: location! },
      { staleTime: Infinity, enabled: !!location },
    ),
  );

  if (isLoading) return <ServiceCategorySkeleton />;

  if (!serviceGroups?.length) {
    return "NO SERVICES";
  }

  const setSelectedCategory = (id: string) => {
    if (!currentCart) return;
    updateCartItem(currentCart?.id, { groupId: id });
  };

  if (!currentCart) return <p>Something is not right</p>;

  return (
    <div className="space-y-3">
      {serviceGroups.map((category) => (
        <button
          key={category.id}
          onClick={() => setSelectedCategory(category.id)}
          className={cn(
            "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
            "hover:border-accent hover:bg-sidebar-accent/10",
            currentCart?.groupId === category.id
              ? "border-accent bg-sidebar-accent/10"
              : "border-sidebar-border bg-accent/10",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3
                className={cn(
                  "font-semibold mb-1 text-base",
                  currentCart?.groupId === category.id
                    ? "text-accent-foreground"
                    : "text-sidebar-foreground",
                )}
              >
                {category.name}
              </h3>
            </div>
            {currentCart?.groupId === category.id && (
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5 " />
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

export default ServiceCategory;

const ServiceCategorySkeleton = () => {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="w-full rounded-xl border-2 border-sidebar-border bg-accent/10 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};
