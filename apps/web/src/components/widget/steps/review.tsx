"use client";

import React, { useMemo } from "react";
import { useCheckoutStore } from "../hooks/useStore";
import { CalendarIcon, Clock, MapPin, User, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueries } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

const ReviewPage = () => {
  const location = useCheckoutStore((s) => s.location);
  const cart = useCheckoutStore((s) => s.cart);
  const appointmentTime = useCheckoutStore((s) => s.appointmentTime);

  console.log("Review Page - appointmentTime:", appointmentTime);

  // Fetch service details for all cart items
  const serviceQueries = useQueries({
    queries: cart.map((item) => ({
      ...trpc.public.getServiceDetails.queryOptions(
        { serviceId: item.serviceId! },
        { enabled: !!item.serviceId, staleTime: Infinity }
      ),
    })),
  });

  // Map cart items with their service details
  const cartWithDetails = useMemo(() => {
    return cart.map((item, index) => {
      const serviceData = serviceQueries[index]?.data;
      const employee = serviceData?.employees.find(
        (e) => e.id === item.employeeServiceId
      );

      return {
        ...item,
        serviceName: serviceData?.name,
        employeeName: employee?.userName,
      };
    });
  }, [cart, serviceQueries]);

  // Calculate totals
  const { totalPrice, totalDuration, totalServices } = useMemo(() => {
    let price = 0;
    let duration = 0;

    cart.forEach((item) => {
      const servicePrice = item.servicePrice ?? 0;
      const addonPrice = item.addons?.reduce((sum, addon) => sum + addon.price, 0) ?? 0;
      price += servicePrice + addonPrice;

      const serviceDuration = item.serviceDuration ?? 0;
      const addonDuration = item.addons?.reduce((sum, addon) => sum + addon.duration, 0) ?? 0;
      duration += serviceDuration + addonDuration;
    });

    return {
      totalPrice: price,
      totalDuration: duration,
      totalServices: cart.length,
    };
  }, [cart]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-sidebar-foreground text-2xl font-semibold">
          Review Your Appointment
        </h2>
        <p className="text-sidebar-foreground/60 text-sm">
          Please review your appointment details before confirming.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-sidebar-accent/20 border border-sidebar-border">
          <div className="flex items-center gap-2 text-sidebar-foreground/60 text-xs mb-1">
            <DollarSign className="w-4 h-4" />
            Total Price
          </div>
          <p className="text-sidebar-foreground text-2xl font-bold">
            ${(totalPrice / 100).toFixed(2)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-sidebar-accent/20 border border-sidebar-border">
          <div className="flex items-center gap-2 text-sidebar-foreground/60 text-xs mb-1">
            <Clock className="w-4 h-4" />
            Total Duration
          </div>
          <p className="text-sidebar-foreground text-2xl font-bold">
            {totalDuration} min
          </p>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-3">
        <h3 className="text-sidebar-foreground font-semibold text-lg">
          Services ({totalServices})
        </h3>

        {cartWithDetails.map((item, index) => {
          const servicePrice = item.servicePrice ?? 0;
          const addonPrice = item.addons?.reduce((sum, addon) => sum + addon.price, 0) ?? 0;
          const serviceDuration = item.serviceDuration ?? 0;
          const addonDuration = item.addons?.reduce((sum, addon) => sum + addon.duration, 0) ?? 0;
          const itemTotal = servicePrice + addonPrice;
          const itemDuration = serviceDuration + addonDuration;

          return (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-sidebar border-2 border-sidebar-border"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-sidebar-foreground/50">
                      Service {index + 1}
                    </span>
                  </div>
                  <h4 className="text-sidebar-foreground font-semibold text-base mb-1">
                    {item.serviceName || "Service Details"}
                  </h4>
                </div>
                <div className="text-right">
                  <p className="text-sidebar-foreground font-bold text-lg">
                    ${(itemTotal / 100).toFixed(2)}
                  </p>
                  <p className="text-sidebar-foreground/60 text-xs flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    {itemDuration} min
                  </p>
                </div>
              </div>

              {/* Employee Info */}
              {item.employeeServiceId && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/20 border border-sidebar-border/50 mb-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-sidebar-foreground/60">
                      Professional
                    </p>
                    <p className="text-sidebar-foreground font-medium text-sm">
                      {item.employeeName || "Selected Specialist"}
                    </p>
                  </div>
                </div>
              )}

              {/* Service Price Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-sidebar-foreground/70">
                    Base Service
                  </span>
                  <span className="text-sidebar-foreground font-medium">
                    ${(servicePrice / 100).toFixed(2)}
                  </span>
                </div>

                {/* Add-ons */}
                {item.addons && item.addons.length > 0 && (
                  <>
                    <div className="pt-2 border-t border-sidebar-border/50">
                      <p className="text-xs text-sidebar-foreground/60 mb-2">
                        Enhancements ({item.addons.length})
                      </p>
                      {item.addons.map((addon) => (
                        <div
                          key={addon.id}
                          className="flex items-center justify-between text-sm py-1"
                        >
                          <span className="text-sidebar-foreground/70 flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-accent" />
                            {addon.title || "Add-on"}
                          </span>
                          <span className="text-sidebar-foreground/70 text-xs">
                            +${(addon.price / 100).toFixed(2)} • {addon.duration}
                            min
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Appointment Details */}
      <div className="p-5 rounded-xl bg-accent/10 border-2 border-accent">
        <h3 className="text-accent-foreground font-semibold text-base mb-3">
          Appointment Summary
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CalendarIcon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-accent-foreground/70 text-xs">
                Date & Time
              </p>
              <p className="text-accent-foreground font-medium">
                {appointmentTime ? (
                  <>
                    {appointmentTime.start.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {" at "}
                    {appointmentTime.start.toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </>
                ) : (
                  "Not selected"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-accent-foreground/70 text-xs">
                Total Duration
              </p>
              <p className="text-accent-foreground font-medium">
                {totalDuration} minutes
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-accent-foreground/70 text-xs">
                Total Price
              </p>
              <p className="text-accent-foreground font-semibold text-lg">
                ${(totalPrice / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Message */}
      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <p className="text-sm text-blue-600 dark:text-blue-400">
          💡 Please review all details carefully before confirming your
          appointment.
        </p>
      </div>
    </div>
  );
};

export default ReviewPage;
