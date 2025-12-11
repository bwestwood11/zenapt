"use client";

import { Card } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import React from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { cn } from "@/lib/utils";
import { useCheckoutStore, useWatchCart } from "../hooks/useStore";

const Services = () => {
  const {location, updateCartItem} = useCheckoutStore()
  const currentCart = useWatchCart()

  const { data: services } = useQuery(
    trpc.public.getServicesByLocation.queryOptions(
      { locationId: location! },
      {
        select(data) {
          return data?.find((d) => d.id === currentCart?.groupId)?.services;
        },
        staleTime: Infinity,
        enabled: !!location
      }
    )
  );

  if (!services) return "NO_SERVICES";

  const setSelectedService = (serviceId: string) => {
    if(!currentCart) return
    updateCartItem(currentCart.id, {serviceId})
  }


  return (
    
          <div className="space-y-3">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => setSelectedService(service.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
                  "hover:border-accent hover:bg-sidebar-accent/10",
                  currentCart?.serviceId === service.id
                    ? "border-accent shadow-sm bg-sidebar-accent/10"
                    : "border-sidebar-border bg-accent/10"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3
                      className={cn(
                        "font-semibold mb-1 text-base",
                        currentCart?.serviceId === service.id
                          ? "text-accent-foreground"
                          : "text-sidebar-foreground"
                      )}
                    >
                      {service.name}
                    </h3>
                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        currentCart?.serviceId === service.id
                          ? "text-accent-foreground/70"
                          : "text-sidebar-foreground/50"
                      )}
                    >
                      {service.excerpt}
                    </p>
                  </div>
                  {currentCart?.serviceId === service.id && (
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            ))}
          </div>
      
  );
};

export default Services;
