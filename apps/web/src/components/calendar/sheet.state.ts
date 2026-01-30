
import { create } from "zustand";
import { useAppointmentStore } from "./store/appointments";

type EditSheetState = {
  appointment: { id: string; empId: string } | null;
};

export const editSheetStore = create<EditSheetState>(() => ({
  appointment: null,
}));

export const openEditSheet = (appointment: { id: string; empId: string }) => {
  editSheetStore.setState({ appointment });
};

export const closeEditSheet = () => {
  editSheetStore.setState({ appointment: null });
};

export const useEditSheet = () => {
  const appointment = editSheetStore((s) => s.appointment);
  const data = useAppointmentStore(
    (state) => state.appointmentsByEmployee[appointment?.empId || ""]
  );
  const appointmentDetails =
    data?.find((a) => a.id === appointment?.id) || null;
  return {
    appointment: appointmentDetails,
    isOpen: Boolean(appointment),
  };
  };
