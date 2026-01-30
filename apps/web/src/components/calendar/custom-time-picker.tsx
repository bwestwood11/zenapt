import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { minutesTo12Hour } from "./utils";
import { motion, AnimatePresence } from "framer-motion";
import { useEmployeeWorkHours } from "./hooks/use-employee-work-hours";
import { Loader2, Clock } from "lucide-react";

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

interface CustomTimePickerProps {
  locationEmployeeId: string;
  locationId: string;
  duration: number;
  selectedDate: Date;
  employeeId: string;
  selectedTimeRange: { start: Date; end: Date } | null;
  onTimeSelect?: (startTime: Date, endTime: Date) => void;
  onConflictChange?: (hasConflict: boolean) => void;
}

const mergeDateAndMinutes = (minutes: number | null, date: Date): Date => {
  if (minutes === null) return new Date(date);
  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);
  localDate.setMinutes(minutes);
  return localDate;
};

const dateToMinutes = (date: Date): number => {
  return date.getHours() * 60 + date.getMinutes();
};

export const CustomTimePicker = ({
  locationEmployeeId,
  locationId,
  duration,
  selectedDate,
  employeeId,
  selectedTimeRange,
  onTimeSelect,
  onConflictChange,
}: CustomTimePickerProps) => {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number | null>(null);

  // Fetch employee work hours
  const {
    workHours,
    isLoading: isLoadingWorkHours,
    isLocationClosed,
  } = useEmployeeWorkHours(employeeId, locationId, selectedDate);

  // Sync internal state with external selectedTimeRange
  useEffect(() => {
    if (selectedTimeRange) {
      const minutes = dateToMinutes(selectedTimeRange.start);
      setSelectedTimeSlot(minutes);
    } else {
      setSelectedTimeSlot(null);
    }
  }, [selectedTimeRange]);

  // Calculate available time slots based on work hours
  const availableTimeSlots = useMemo(() => {
    if (!workHours) return [];

    const { startMinute, endMinute } = workHours;

    // Generate all 15-minute intervals within work hours
    const slots: number[] = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
      // Check if the slot is within work hours
      // and if the appointment would end before work hours end
      if (minutes >= startMinute && minutes + duration <= endMinute) {
        slots.push(minutes);
      }
    }

    return slots;
  }, [workHours, duration]);

  const { data: conflictCheck, isLoading: isCheckingConflict } = useQuery(
    trpc.appointment.hasConflictForTimings.queryOptions(
      {
        locationEmployeeId,
        locationId,
        proposedStartTime: selectedTimeSlot
          ? mergeDateAndMinutes(selectedTimeSlot, selectedDate)
          : new Date(),
        proposedEndTime: mergeDateAndMinutes(
          (selectedTimeSlot ?? 0) + duration,
          selectedDate,
        ),
      },
      { enabled: !!selectedTimeSlot && !!duration },
    ),
  );

  // Notify parent of conflict status changes
  useEffect(() => {
    if (onConflictChange && !isCheckingConflict) {
      onConflictChange(conflictCheck?.hasConflict ?? false);
    }
  }, [conflictCheck?.hasConflict, isCheckingConflict, onConflictChange]);

  const handleTimeSlotChange = (value: string) => {
    const minutes = value ? parseInt(value) : null;
    setSelectedTimeSlot(minutes);

    if (minutes !== null && onTimeSelect) {
      const startTime = mergeDateAndMinutes(minutes, selectedDate);
      const endTime = mergeDateAndMinutes(minutes + duration, selectedDate);
      onTimeSelect(startTime, endTime);
    }
  };

  if (isLoadingWorkHours) {
    return (
      <div className="space-y-4 w-full h-[280px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading available times...
          </p>
        </div>
      </div>
    );
  }

  if (isLocationClosed) {
    return (
      <div className="space-y-4 w-full h-[280px] flex items-center justify-center">
        <div className="rounded-lg border bg-muted/30 p-6 text-center max-w-xs">
          <Clock className="size-8 mx-auto mb-3 text-muted-foreground" />
          <h4 className="font-medium text-sm mb-2">Location Closed</h4>
          <p className="text-sm text-muted-foreground">
            This location is closed on the selected date.
          </p>
        </div>
      </div>
    );
  }

  if (!workHours || availableTimeSlots.length === 0) {
    return (
      <div className="space-y-4 w-full h-[280px] flex items-center justify-center">
        <div className="rounded-lg border bg-muted/30 p-6 text-center max-w-xs">
          <Clock className="size-8 mx-auto mb-3 text-muted-foreground" />
          <h4 className="font-medium text-sm mb-2">No Available Times</h4>
          <p className="text-sm text-muted-foreground">
            No time slots available for the selected date and duration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="space-y-3">
        <h3 className="text-sidebar-foreground font-medium">
          Select Time Slot
        </h3>
        <Select
          value={selectedTimeSlot !== null ? selectedTimeSlot.toString() : ""}
          onValueChange={handleTimeSlotChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose appointment time..." />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>
                Available Times ({minutesTo12Hour(workHours.startMinute)} -{" "}
                {minutesTo12Hour(workHours.endMinute)})
              </SelectLabel>
              {availableTimeSlots.map((minutes) => (
                <SelectItem key={minutes} value={minutes.toString()}>
                  {minutesTo12Hour(minutes)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <AnimatePresence mode="wait">
        {selectedTimeSlot !== null && (
          <motion.div
            key="appointment-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <h4 className="font-medium text-sm">Appointment Details</h4>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Start Time</span>
                  <span className="font-medium">
                    {mergeDateAndMinutes(
                      selectedTimeSlot,
                      selectedDate,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">End Time</span>
                  <span className="font-medium">
                    {mergeDateAndMinutes(
                      selectedTimeSlot + duration,
                      selectedDate,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">
                    {formatDuration(duration)}
                  </span>
                </div>
              </div>

              <AnimatePresence>
                {isCheckingConflict && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Loader2 className="size-3 animate-spin" />
                    <span>Checking availability...</span>
                  </motion.div>
                )}

                {!isCheckingConflict && conflictCheck?.hasConflict && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive font-medium">
                        ⚠️ Time slot unavailable
                      </p>
                      <p className="text-xs text-destructive/80 mt-1">
                        This time conflicts with another appointment. Please
                        select a different time.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
