"use client";

import React, { useEffect } from "react";
import { useOrgId } from "../hooks/useOrgId";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

import { Skeleton } from "@/components/ui/skeleton";
import { Controller, useFormContext } from "react-hook-form";
import type { WidgetDataType } from "../schema";
import { useCheckoutStore } from "../hooks/useStore";

const Locations = () => {
  const orgId = useOrgId();
  const {
    data: locations,
    isError,
    isLoading,
    error,
  } = useQuery(trpc.public.getAllLocations.queryOptions({ orgId }));
  const {location: selectedLocation, setLocation} = useCheckoutStore()

  useEffect(() => {
    // console.log({ isError });
    // if (isError)
      // setError(error.message || "Something is not good. Try again later");
  }, [isError]);

  if (isLoading) return <LocationSkeletonList count={2} />;
  if (!locations?.length) return "NO LOCATIONS";

  return (
    <div className="grid grid-cols-2 gap-5 min-w-0 ">
        {locations.map((location) => (
              <button
                type="button"
                key={location.id}
                onClick={() => setLocation(location.id)}
                className={`w-full text-left transition-all duration-300 ${
                  selectedLocation === location.id
                    ? "border-2 border border-primary shadow-lg shadow-primary/20"
                    : " hover:ring-accent/70 hover:shadow-md"
                } rounded-xl overflow-hidden bg-card`}
              >
                <div className=" max-h-[200px] overflow-hidden">
                  <img
                    src={
                      location.image ||
                      "https://www.shutterstock.com/shutterstock/photos/2694554933/display_1500/stock-vector-an-elegant-topographic-map-background-with-placeholder-text-and-location-markers-in-neutral-tones-2694554933.jpg"
                    }
                    alt={location.name}
                    className="w-full h-full object-cover  transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-foreground mb-2 text-base capitalize">
                    {location.name.split("-").join(" ").toLowerCase()}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {location.address}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {location.city}
                  </p>
                </div>
              </button>
            ))}
    
    </div>
  );
};

export default Locations;

export function LocationSkeletonList({ count = 3 }: { count: number }) {
  return (
    <div className="grid grid-cols-2 gap-5 min-w-0">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-full rounded-xl overflow-hidden bg-card border shadow-md"
        >
          <div className="max-h-[150px] w-full">
            <Skeleton className="h-[150px] w-full" />
          </div>

          <div className="p-5 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
