"use client";

import { Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Switch } from "../ui/switch";
import { useCalendarPreferencesStore } from "./store/preference";

export function CalendarSettings() {
  const [open, setOpen] = useState(false);
  const clickToAddEnabled = useCalendarPreferencesStore(
    (state) => state.clickToAddAppointment,
  );
  const setClickToAddEnabled = useCalendarPreferencesStore(
    (state) => state.setClickToAddAppointment,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-lg border-stone-300 hover:bg-stone-100 hover:border-stone-400 transition-all shadow-sm"
        >
          <Settings className="w-4 h-4 text-stone-700" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="end">
        <div className="px-4 py-3 border-b">
          <h4 className="font-semibold text-sm text-stone-900">
            Calendar Settings
          </h4>
          <p className="text-xs text-stone-500 mt-0.5">
            Customize your calendar experience
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-0.5">
              <Label
                htmlFor="click-to-add"
                className="text-sm font-medium text-stone-900 cursor-pointer"
              >
                Quick Add Appointments
              </Label>
              <p className="text-xs text-stone-500 leading-relaxed">
                Click any empty time slot to instantly create a new appointment
              </p>
            </div>
            <Switch
              id="click-to-add"
              checked={clickToAddEnabled}
              onCheckedChange={setClickToAddEnabled}
              className="mt-0.5"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
