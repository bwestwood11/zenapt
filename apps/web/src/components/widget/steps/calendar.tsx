"use client";

import React, { useState } from "react";
import { Calendar } from "../../ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const availableTimeSlots = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");

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
              onSelect={setSelectedDate}
              className="rounded-xl  [--cell-size:--spacing(11)] md:[--cell-size:--spacing(10)]"
              disabled={(date) => date < new Date()}
              
              // classNames={}
              styles={{ week: { gap: 20 }, cell: {borderRadius: "99999999999px"}, weeks: { marginTop: 0 }  }}
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
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {availableTimeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={cn(
                    "py-3 px-4 rounded-lg border-2 transition-all duration-200 text-sm font-medium",
                    selectedTime === time
                      ? "bg-accent border-accent text-accent-foreground shadow-md"
                      : "bg-sidebar-accent/20 border-sidebar-border text-sidebar-foreground hover:border-accent/50 hover:bg-accent/10"
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Date/Time Summary */}
        {selectedDate && selectedTime && (
          <div className="p-5 rounded-xl bg-accent/10 border-2 border-accent">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-accent-foreground/70 text-sm mb-1">
                  Selected Appointment
                </p>
                <p className="text-accent-foreground text-lg font-semibold">
                  {selectedDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  at {selectedTime}
                </p>
                <p className="text-accent-foreground/60 text-sm mt-1">
                  with Diwanshu
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
