import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  closeAddAppointmentDialog,
  useAddAppointmentDialog,
} from "./add-appointment.state";
import type { Employee } from "./types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Sparkles } from "lucide-react";
import { AvailableTimesSection } from "./available-times-section";
import { CustomerSelector } from "./customer-selector";
import { ServiceSelector } from "./service-selector";
import { AddOnSelector } from "./addon-selector";
import { TimingModeSelector } from "./timing-mode-selector";
import { CustomTimePicker } from "./custom-time-picker";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar } from "../ui/calendar";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/src/routers";

type TimingMode = "available" | "custom";

interface TimeRange {
  start: Date;
  end: Date;
}

// Helper function to format duration in hours and minutes
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
};
type Customer =
  inferRouterOutputs<AppRouter>["appointment"]["getCustomersForAppointment"]["customers"][number];
export const AddAppointmentDialog = ({
  employees,
  locationId,
  date: initialDate,
}: {
  employees: Employee[];
  locationId: string;
  date: Date;
}) => {
  const dialogState = useAddAppointmentDialog();

  const selectedEmployeeId = dialogState?.empId;

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange | null>(
    null,
  );
  const [timingMode, setTimingMode] = useState<TimingMode>("available");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (dialogState) {
      setSelectedTimeRange(null);
      setSelectedServiceIds([]);
      setSelectedAddOnIds([]);
      setSelectedDate(initialDate);
      setSelectedCustomer(null);
      setTimingMode("available");
    }
  }, [dialogState, initialDate]);

  // Reset time range when switching modes
  useEffect(() => {
    setSelectedTimeRange(null);
  }, [timingMode]);

  // Reset time range when date changes
  useEffect(() => {
    setSelectedTimeRange(null);
  }, [selectedDate]);

  // Fetch employee services
  const { data: employeeServices } = useQuery(
    trpc.services.getEmployeeServices.queryOptions(
      {
        locationEmployeeId: selectedEmployeeId || "",
        locationId,
      },
      {
        enabled: !!selectedEmployeeId,
      },
    ),
  );

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (!employeeServices) return 0;

    const serviceDuration = selectedServiceIds.reduce((total, serviceId) => {
      const service = employeeServices.find((s) => s.id === serviceId);
      return total + (service?.duration || 0);
    }, 0);

    const addOnDuration = selectedAddOnIds.reduce((total, addOnId) => {
      const service = employeeServices.find((s) =>
        s.addOns?.some((a) => a.id === addOnId),
      );
      const addOn = service?.addOns?.find((a) => a.id === addOnId);
      return total + (addOn?.incrementalDuration || 0);
    }, 0);

    return serviceDuration + addOnDuration;
  }, [selectedServiceIds, selectedAddOnIds, employeeServices]);

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (!employeeServices) return 0;

    const servicePrice = selectedServiceIds.reduce((total, serviceId) => {
      const service = employeeServices.find((s) => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);

    const addOnPrice = selectedAddOnIds.reduce((total, addOnId) => {
      const service = employeeServices.find((s) =>
        s.addOns?.some((a) => a.id === addOnId),
      );
      const addOn = service?.addOns?.find((a) => a.id === addOnId);
      return total + (addOn?.basePrice || 0);
    }, 0);

    return servicePrice + addOnPrice;
  }, [selectedServiceIds, selectedAddOnIds, employeeServices]);

  // Get selected services details
  const selectedServices = useMemo(() => {
    if (!employeeServices) return [];
    return selectedServiceIds
      .map((id) => employeeServices.find((s) => s.id === id))
      .filter(Boolean);
  }, [selectedServiceIds, employeeServices]);

  // Get selected add-ons details
  const selectedAddOns = useMemo(() => {
    if (!employeeServices) return [];
    return selectedAddOnIds
      .map((addOnId) => {
        const service = employeeServices.find((s) =>
          s.addOns?.some((a) => a.id === addOnId),
        );
        return service?.addOns?.find((a) => a.id === addOnId);
      })
      .filter(Boolean);
  }, [selectedAddOnIds, employeeServices]);

  // Fetch available timings
  const { data: availableTimings } = useQuery(
    trpc.appointment.getAvailableTimings.queryOptions(
      {
        date: selectedDate,
        duration: totalDuration,
        employeeId: selectedEmployeeId ?? "",
        locationId,
      },
      {
        enabled: !!selectedEmployeeId && !!totalDuration,
      },
    ),
  );

  const hasSelectedServices = selectedServiceIds.length > 0;
  const firstEmployeeService = employeeServices?.[0];
  const shouldShowTimingSection = hasSelectedServices && selectedCustomer;

  // Check if form is complete and valid
  const isFormValid =
    selectedCustomer &&
    hasSelectedServices &&
    selectedTimeRange &&
    selectedEmployeeId &&
    !hasConflict;

  const handleTimeRangeSelect = (start: Date, end: Date) => {
    setSelectedTimeRange({ start, end });
  };

  const handleConflictChange = (conflict: boolean) => {
    setHasConflict(conflict);
  };

  const queryClient = useQueryClient();
  // Create appointment mutation
  const createAppointmentMutation = useMutation(
    trpc.appointment.createAppointment.mutationOptions({
      onSuccess: () => {
        closeAddAppointmentDialog();
        // Invalidate appointments query to refresh calendar
        queryClient.invalidateQueries({
          queryKey: trpc.appointment.fetchAppointments.queryKey({
            startDate: selectedDate,
            endDate: new Date(
              selectedDate.getFullYear(),
              selectedDate.getMonth(),
              selectedDate.getDate(),
              23,
              59,
              59,
              999,
            ),
            locationId,
          }),
        });
      },
      onError: (error) => {
        console.error("Failed to create appointment:", error);
        // TODO: Show error toast
      },
    }),
  );

  const handleSubmit = () => {
    if (!isFormValid || !selectedTimeRange) return;

    createAppointmentMutation.mutate({
      customerId: selectedCustomer.id,
      locationEmployeeId: selectedEmployeeId,
      locationId,
      serviceIds: selectedServiceIds,
      addOnIds: selectedAddOnIds.length > 0 ? selectedAddOnIds : undefined,
      startTime: selectedTimeRange.start,
      endTime: selectedTimeRange.end,
    });
  };

  return (
    <>
      <Dialog
        open={!!dialogState}
        onOpenChange={(isOpen) => {
          if (!isOpen) closeAddAppointmentDialog();
        }}
      >
        <DialogContent className="max-w-[90svw] sm:max-w-fit w-fit">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              New Appointment
            </DialogTitle>
            <DialogDescription>
              Create a new appointment by selecting a customer and service.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-6">
            {/* Left Column: Customer and Service Selection */}
            <div className="flex flex-col gap-5 py-4 w-[400px]">
              <CustomerSelector
                locationId={locationId}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
              />

              {selectedEmployeeId && (
                <ServiceSelector
                  locationId={locationId}
                  locationEmployeeId={selectedEmployeeId}
                  selectedServiceIds={selectedServiceIds}
                  onSelectServices={setSelectedServiceIds}
                />
              )}

              {/* Add-Ons Selector - Only show if services are selected */}
              {selectedServiceIds.length > 0 && (
                <AddOnSelector
                  employeeServices={employeeServices}
                  selectedServiceIds={selectedServiceIds}
                  selectedAddOnIds={selectedAddOnIds}
                  onSelectAddOns={setSelectedAddOnIds}
                />
              )}

              {/* Appointment Summary */}
              <AnimatePresence>
                {selectedTimeRange && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-lg border bg-primary/5 p-4 space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Sparkles className="size-4" />
                        Selected Appointment
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Date</span>
                          <span className="font-medium">
                            {selectedDate.toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Time</span>
                          <span className="font-medium">
                            {selectedTimeRange.start.toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}{" "}
                            -{" "}
                            {selectedTimeRange.end.toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-muted-foreground">
                            Duration
                          </span>
                          <span className="font-medium">
                            {formatDuration(totalDuration)}
                          </span>
                        </div>
                        <div className="pt-2 border-t space-y-2">
                          <span className="text-muted-foreground text-xs">
                            Services
                          </span>
                          {selectedServices.map((service) => (
                            <div
                              key={service?.serviceTerms.id}
                              className="flex items-center justify-between"
                            >
                              <span className="font-medium text-xs">
                                {service?.serviceTerms.name}
                              </span>
                              <span className="font-medium text-xs">
                                ${service?.price && service?.price / 100}
                              </span>
                            </div>
                          ))}
                        </div>
                        {selectedAddOns.length > 0 && (
                          <div className="pt-2 border-t space-y-2">
                            <span className="text-muted-foreground text-xs">
                              Add-Ons
                            </span>
                            {selectedAddOns.map((addOn) => (
                              <div
                                key={addOn?.id}
                                className="flex items-center justify-between"
                              >
                                <span className="font-medium text-xs">
                                  {addOn?.name}
                                </span>
                                <span className="font-medium text-xs">
                                  ${addOn?.basePrice && addOn?.basePrice / 100}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-muted-foreground font-semibold">
                            Total
                          </span>
                          <span className="font-semibold">
                            ${(totalPrice / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column: Date and Time Selection - Only show when ready */}
            <AnimatePresence mode="wait">
              {shouldShowTimingSection && (
                <motion.div
                  key="timing-column"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "450px" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="w-[450px] space-y-4">
                    {/* Shared Calendar */}
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      className="rounded-xl [--cell-size:--spacing(11)] md:[--cell-size:--spacing(10)] w-full"
                      disabled={(date) => date < new Date()}
                      styles={{
                        week: { gap: 20 },
                        cell: { borderRadius: "99999999999px" },
                        weeks: { marginTop: 0 },
                      }}
                    />

                    {/* Mode Selector */}
                    <TimingModeSelector
                      selectedMode={timingMode}
                      onModeChange={setTimingMode}
                    />

                    {/* Time Picker - fixed height container to prevent shifts */}
                    <div className="min-h-[280px]">
                      <AnimatePresence mode="wait">
                        {timingMode === "available" && (
                          <motion.div
                            key="available-times"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <AvailableTimesSection
                              date={selectedDate}
                              timings={availableTimings}
                              selectedRange={selectedTimeRange}
                              onTimeSelect={(range) =>
                                handleTimeRangeSelect(range.start, range.end)
                              }
                            />
                          </motion.div>
                        )}

                        {timingMode === "custom" &&
                          firstEmployeeService &&
                          selectedEmployeeId && (
                            <motion.div
                              key="custom-picker"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                            >
                              <CustomTimePicker
                                locationEmployeeId={
                                  firstEmployeeService.locationEmployeeId || ""
                                }
                                locationId={locationId}
                                duration={totalDuration}
                                selectedDate={selectedDate}
                                employeeId={selectedEmployeeId}
                                selectedTimeRange={selectedTimeRange}
                                onTimeSelect={handleTimeRangeSelect}
                                onConflictChange={handleConflictChange}
                              />
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => closeAddAppointmentDialog()}
              disabled={createAppointmentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowConfirmation(true)}
              disabled={!isFormValid || createAppointmentMutation.isPending}
              className="min-w-[120px]"
            >
              {createAppointmentMutation.isPending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="mr-2"
                  >
                    ⏳
                  </motion.div>
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2" />
                  Create Appointment
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Appointment</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p>Please review the appointment details before confirming:</p>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium">
                      {selectedCustomer?.user.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">
                      {selectedDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {selectedTimeRange && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">
                        {selectedTimeRange.start.toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {selectedTimeRange.end.toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t space-y-2">
                    <span className="text-muted-foreground">Services</span>
                    <div className="space-y-1.5 ml-2">
                      {selectedServices.map((service) => (
                        <div
                          key={service?.serviceTerms.id}
                          className="flex items-center justify-between"
                        >
                          <span className="font-medium text-xs">
                            {service?.serviceTerms.name}
                          </span>
                          <span className="font-medium text-xs">
                            $
                            {service?.price &&
                              (service?.price / 100).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {selectedAddOns.length > 0 && (
                      <div className="pt-2 border-t space-y-2">
                        <span className="text-muted-foreground">Add-Ons</span>
                        <div className="space-y-1.5 ml-2">
                          {selectedAddOns.map((addOn) => (
                            <div
                              key={addOn?.id}
                              className="flex items-center justify-between"
                            >
                              <span className="font-medium text-xs">
                                {addOn?.name}
                              </span>
                              <span className="font-medium text-xs">
                                $
                                {addOn?.basePrice &&
                                  (addOn?.basePrice / 100).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t font-semibold">
                      <span>Total</span>
                      <span>${(totalPrice / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              Confirm & Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
