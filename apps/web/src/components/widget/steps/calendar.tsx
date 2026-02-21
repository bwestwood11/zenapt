"use client";

import React, { useState, useMemo } from "react";
import { Calendar } from "../../ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCheckoutStore } from "../hooks/useStore";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { motion } from "motion/react";
import { formatDuration } from "../utils/format-duration";
import {
  formatDateInTimeZone,
  formatTimeRangeInTimeZone,
  getLocalTimeZone,
  shouldShowLocationTime,
} from "../utils/timezone-display";

const CalendarPage = () => {
  const location = useCheckoutStore((s) => s.location);
  const locationTimeZone = useCheckoutStore((s) => s.locationTimeZone);
  const cart = useCheckoutStore((s) => s.cart);
  const appointmentTime = useCheckoutStore((s) => s.appointmentTime);
  const setAppointmentTime = useCheckoutStore((s) => s.setAppointmentTime);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    appointmentTime?.start,
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState<{
    start: Date;
    end: Date;
  } | null>(appointmentTime);
  const localTimeZone = getLocalTimeZone();
  const effectiveLocationTimeZone = locationTimeZone ?? localTimeZone;
  const showLocationDateTime =
    !!selectedTimeRange &&
    shouldShowLocationTime(
      selectedTimeRange.start,
      selectedTimeRange.end,
      localTimeZone,
      effectiveLocationTimeZone,
    );

  // Calculate total duration from all cart items
  const totalDuration = useMemo(() => {
    return cart.reduce((total, item) => {
      const serviceDuration = item.serviceDuration ?? 0;
      const addonsDuration =
        item.addons?.reduce((sum, addon) => sum + addon.duration, 0) ?? 0;
      return total + serviceDuration + addonsDuration;
    }, 0);
  }, [cart]);

  // Get all employee IDs from cart items
  const employeeIds = useMemo(() => {
    return cart
      .map((item) => item.employeeId)
      .filter((id): id is string => !!id);
  }, [cart]);

  // For now, we'll use the first employee's ID to fetch timings
  // In a more complex scenario, you'd need to check availability for all employees
  const primaryEmployeeId = employeeIds[0];

  // Fetch available timings when date is selected
  const { data: timings, isLoading } = useQuery(
    trpc.appointment.getAvailableTimings.queryOptions(
      {
        locationId: location!,
        employeeId: primaryEmployeeId!,
        date: selectedDate!,
        duration: totalDuration,
      },
      {
        enabled:
          !!selectedDate &&
          !!location &&
          !!primaryEmployeeId &&
          totalDuration > 0,
        staleTime: 60000, // 1 minute
      },
    ),
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-sidebar-foreground text-2xl font-semibold flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-accent" />
          Select Date & Time
        </h2>
        <p className="text-sidebar-foreground/60 text-sm">
          Choose your preferred appointment date and time.
        </p>
      </div>

      {/* Calendar */}
      <div className="space-y-4 px-2">
        <div>
          <h3 className="text-sidebar-foreground font-medium mb-3">
            Select a Date
          </h3>
          <div className="flex justify-center px-5">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setSelectedTimeRange(null); // Reset time selection when date changes
              }}
              className="rounded-xl  [--cell-size:--spacing(11)] md:[--cell-size:--spacing(10)]"
              disabled={(date) => date < new Date()}
              styles={{
                week: { gap: 20 },
                cell: { borderRadius: "99999999999px" },
                weeks: { marginTop: 0 },
              }}
            />
          </div>
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div className="space-y-3">
            <h3 className="text-sidebar-foreground font-medium">
              Available Times
            </h3>
            <p className="text-sidebar-foreground/60 text-sm">
              Local date: {formatDateInTimeZone(selectedDate, localTimeZone)}
            </p>
            {formatDateInTimeZone(selectedDate, localTimeZone) !==
              formatDateInTimeZone(selectedDate, effectiveLocationTimeZone) && (
              <p className="text-sidebar-foreground/60 text-xs">
                Location date: {formatDateInTimeZone(selectedDate, effectiveLocationTimeZone)}
              </p>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center min-h-[200px] text-sm text-sidebar-foreground/60">
                Loading available times...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 min-h-[200px] max-h-[280px] overflow-y-auto pr-2">
                {timings && timings.length > 0 ? (
                  timings.map((time, index) => {
                    const isSelected =
                      !!selectedTimeRange &&
                      selectedTimeRange.start.getTime() ===
                        time.start.getTime();

                    return (
                      <motion.button
                        key={time.start.toISOString()}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          duration: 0.15,
                          delay: Math.min(index * 0.02, 0.3),
                          ease: "easeOut",
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const timeRange = {
                            start: time.start,
                            end: time.end,
                          };
                          setSelectedTimeRange(timeRange);
                          setAppointmentTime(timeRange);
                        }}
                        className={cn(
                          "py-2.5 px-3 rounded-lg border-2 transition-all duration-150 text-sm font-medium",
                          isSelected
                            ? "bg-accent border-accent text-accent-foreground shadow-sm"
                            : "bg-sidebar-accent/20 border-sidebar-border text-sidebar-foreground hover:border-accent/50 hover:bg-accent/10",
                        )}
                      >
                        <span className="block leading-tight">
                          {formatTimeRangeInTimeZone(time.start, time.end, localTimeZone)}
                        </span>
                        {shouldShowLocationTime(
                          time.start,
                          time.end,
                          localTimeZone,
                          effectiveLocationTimeZone,
                        ) && (
                          <span className="block text-[11px] opacity-80 leading-tight mt-0.5">
                            {formatTimeRangeInTimeZone(
                              time.start,
                              time.end,
                              effectiveLocationTimeZone,
                            )}
                          </span>
                        )}
                      </motion.button>
                    );
                  })
                ) : (
                  <div className="col-span-2 flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                    <div className="text-center">
                      <p className="font-medium">No available time slots</p>
                      <p className="text-xs mt-1">
                        Try selecting a different date
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Selected Date/Time Summary */}
        {selectedDate && selectedTimeRange && (
          <div className="p-5 rounded-xl bg-accent/10 border-2 border-accent">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-accent-foreground/70 text-sm mb-1">
                  Selected Appointment
                </p>
                <p className="text-accent-foreground text-base font-semibold">
                  Local: {formatDateInTimeZone(selectedDate, localTimeZone)} at{" "}
                  {formatTimeRangeInTimeZone(
                    selectedTimeRange.start,
                    selectedTimeRange.end,
                    localTimeZone,
                  )}
                </p>
                {showLocationDateTime && (
                  <p className="text-accent-foreground/70 text-sm mt-1">
                    Location: {formatDateInTimeZone(selectedDate, effectiveLocationTimeZone)} at{" "}
                    {formatTimeRangeInTimeZone(
                      selectedTimeRange.start,
                      selectedTimeRange.end,
                      effectiveLocationTimeZone,
                    )}
                  </p>
                )}
                <p className="text-accent-foreground/60 text-sm mt-1">
                  Duration: {formatDuration(totalDuration)}
                </p>
              </div>
              <CalendarIcon className="w-8 h-8 text-accent" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
