
import { closeEditSheet, useEditSheet } from "./sheet.state";
import { useState } from "react";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { Calendar } from "../ui/calendar";

export const EditSheet = () => {
  const { isOpen, appointment } = useEditSheet();

  return (
    <Sheet open={isOpen} onOpenChange={(newState) => {
        if(!newState) closeEditSheet()
    }}>
      <SheetContent side="right" className="w-105">
        <SheetHeader>
          <SheetTitle>Edit Appointment</SheetTitle>
        </SheetHeader>

        {appointment ? (
          <div className="mt-4">
            <form className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-medium" htmlFor="title">
                    Title
                </label>
                <input
                    type="text"
                    id="title"
                    defaultValue={appointment.title}
                    className="border p-2 rounded"
                />
              </div>
                <div className="flex flex-col gap-1">
                <label className="font-medium" htmlFor="price">
                    Price
                </label>
                <input
                    type="number"
                    id="price"
                  defaultValue={appointment.price / 100}
                    className="border p-2 rounded"
                />
                <CalendarComponent />
              </div>
              </form>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};


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

const CalendarComponent = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");

  return (
    <div className="space-y-6">
  
      
    </div>
  );
};

