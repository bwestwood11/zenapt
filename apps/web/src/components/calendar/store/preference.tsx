import { create } from "zustand";
import { persist } from "zustand/middleware";

type CalendarPreferenceStore = {
  clickToAddAppointment: boolean;
  setClickToAddAppointment: (val: boolean) => void;
};

export const useCalendarPreferencesStore = create<CalendarPreferenceStore>()(
  persist(
    (set) => ({
      clickToAddAppointment: true,
      setClickToAddAppointment: (val: boolean) =>
        set({ clickToAddAppointment: val }),
    }),
    { name: "calendar-preferences" }
  )
);
