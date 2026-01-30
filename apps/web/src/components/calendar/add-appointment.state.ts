
import { create } from "zustand";
import { useCalendarPreferencesStore } from "./store/preference";

type AddAppointmentState = {
    data: {
        empId: string;
        start: number;
    } | null;

};

export const addAppointmentStore = create<AddAppointmentState>(() => ({
  data: null,
}));

export const openAddAppointmentDialog = (data: Required<AddAppointmentState["data"]>) => {
  if(!useCalendarPreferencesStore.getState().clickToAddAppointment) return false
  addAppointmentStore.setState({ data });
};

export const closeAddAppointmentDialog = () => {
  addAppointmentStore.setState({ data: null });
};

export const useAddAppointmentDialog = () => {
  return addAppointmentStore((s) => s.data)
};
