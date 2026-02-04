"use client";

import React, { useMemo } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { WidgetDataType } from "../schema";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { ChevronDown, ChevronUp, Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCheckoutStore, useWatchCart } from "../hooks/useStore";
import { useCartActions, useCartCalculations } from "../hooks/useCart";

// Work on UI, fix colors, filter out unavailable employees, add profile images of employees to add-ons, store add-ons in form data, make sure description of service or add-on is not too long (truncate it)

const ServiceDetails = () => {
  const [addOnsExpanded, setAddOnsExpanded] = React.useState(false);
  const currentCart = useWatchCart();
  const { data: service } = useQuery(
    trpc.public.getServiceDetails.queryOptions(
      { serviceId: currentCart?.serviceId! },
      { enabled: !!currentCart?.serviceId, staleTime: Infinity },
    ),
  );

  const { selectEmployee, toggleAddOn } = useCartActions(currentCart);
  const { addonPrice, addonDuration } = useCartCalculations(
    service,
    currentCart,
  );

  if (!service) return "NOT_FOUND";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-6">
        <h2 className="text-sidebar-foreground text-2xl font-semibold mb-4 tracking-tight">
          {service.name}
        </h2>
        {/* TODO: PREVENT TOO LONG DESCRIPTION */}
        {service.description && (
          <div
            className="text-sidebar-foreground/60 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: service.description }}
          />
        )}
      </div>
      <div className="mb-6">
        <button
          onClick={() => setAddOnsExpanded(!addOnsExpanded)}
          className="w-full border-2 border-accent/30 bg-accent/5 hover:bg-accent/10 hover:border-accent text-accent-foreground h-auto py-3 px-4 rounded-xl transition-all duration-200 flex items-center"
        >
          <Plus className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="flex-1 text-left">
            <span className="block font-semibold">Add Enhancements</span>
            {!!currentCart?.addons?.length && (
              <span className="block text-xs text-accent-foreground/70 mt-0.5">
                {currentCart.addons.length} selected • +${addonPrice / 100} +
                {addonDuration} min
              </span>
            )}
          </span>
          {addOnsExpanded ? (
            <ChevronUp className="w-4 h-4 ml-2 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
          )}
        </button>

        {addOnsExpanded && (
          <div className="mt-3 p-4 bg-sidebar/30 rounded-xl border border-sidebar-border">
            <div className="mb-3">
              <h4 className="text-sidebar-foreground font-semibold text-base">
                Available Add-Ons
              </h4>
              <p className="text-sidebar-foreground/60 text-xs mt-1">
                Enhance your {service.name} experience
              </p>
            </div>
            <div className="space-y-3">
              {service.addOns.map((addOn) => (
                <label
                  key={addOn.id}
                  className={cn(
                    "flex gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200",
                    "hover:border-accent hover:bg-sidebar-accent/30",
                    currentCart?.addons?.some((a) => addOn.id === a.id)
                      ? "border-accent bg-sidebar-accent/30 shadow-sm"
                      : "border-sidebar-border bg-sidebar",
                  )}
                >
                  <Checkbox
                    checked={currentCart?.addons?.some(
                      (a) => addOn.id === a.id,
                    )}
                    onCheckedChange={() =>
                      toggleAddOn({
                        duration: addOn.incrementalDuration,
                        id: addOn.id,
                        price: addOn.basePrice,
                        title: addOn.name,
                      })
                    }
                    className="mt-1 flex-shrink-0 border-primary"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h5 className="font-semibold text-sidebar-foreground text-sm">
                        {addOn.name}
                      </h5>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-sidebar-foreground text-sm">
                          +${addOn.basePrice / 100}
                        </p>
                        <p className="text-xs text-sidebar-foreground/50 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {addOn.incrementalDuration}
                        </p>

                        <div className="*:data-[slot=avatar]:ring-background py-2 -space-x-2 justify-end flex *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale">
                          {service.Service.filter((s) =>
                            s.addOns.some((a) => a.id === addOn.id),
                          ).map((a) => (
                            <Avatar key={a?.locationEmployee?.user.id}>
                              <AvatarImage
                                src={a?.locationEmployee?.user.image ?? ""}
                                alt={
                                  a?.locationEmployee?.user.name ??
                                  "Employee Avatar"
                                }
                              />
                              <AvatarFallback>
                                {a.locationEmployee?.user?.name
                                  ?.split(" ")
                                  .map((a) => a[0])
                                  .join(" ")}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-sidebar-foreground/60 leading-relaxed">
                      {addOn.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mb-4">
        <h3 className="text-sidebar-foreground text-lg font-semibold mb-2 tracking-tight">
          Choose a Professional
        </h3>
        <p className="text-sidebar-foreground/60 text-sm">
          Select a professional to perform your service.
        </p>
      </div>

      <div className="space-y-3">
        {service.employees
          .filter(
            (e) =>
              !!(currentCart?.addons ?? []).every((id) =>
                e.addons.some((a) => a.id === id.id),
              ),
          )
          .map((professional) => {
            const totalPrice = professional.price + addonPrice;
            return (
              <button
                key={professional.id}
                onClick={() =>
                  selectEmployee(
                    professional.id,
                    professional.locationEmployeeId,
                    professional.price,
                    professional.duration,
                  )
                }
                className={cn(
                  "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
                  "hover:bg-sidebar-accent/30",
                  currentCart?.employeeServiceId === professional.id
                    ? "border-accent bg-sidebar-accent/30 shadow-sm"
                    : "border-sidebar-border bg-sidebar",
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-lg",
                        currentCart?.employeeServiceId === professional.id
                          ? "bg-sidebar-accent text-accent"
                          : "bg-accent/20 text-sidebar-foreground/40",
                      )}
                    >
                      {professional.userName
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") ?? "Bubba"}
                    </div>
                    <div className="flex-1">
                      <h4
                        className={cn(
                          "font-semibold text-base",
                          currentCart?.employeeServiceId === professional.id
                            ? "text-accent-foreground"
                            : "text-sidebar-foreground",
                        )}
                      >
                        {professional.userName}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={cn(
                        "font-semibold text-lg",
                        currentCart?.employeeServiceId === professional.id
                          ? "text-accent-foreground"
                          : "text-sidebar-foreground",
                      )}
                    >
                      ${totalPrice / 100}
                    </p>
                    {addonPrice > 0 && (
                      <p
                        className={cn(
                          "text-xs",
                          currentCart?.employeeServiceId === professional.id
                            ? "text-accent-foreground/60"
                            : "text-sidebar-foreground/40",
                        )}
                      >
                        ${professional.price / 100} + ${addonPrice / 100}
                      </p>
                    )}
                    <p
                      className={cn(
                        "text-sm flex items-center justify-end gap-1",
                        currentCart?.employeeServiceId === professional.id
                          ? "text-accent-foreground/70"
                          : "text-sidebar-foreground/50",
                      )}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {professional.duration + addonDuration} min
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
};

export default ServiceDetails;
