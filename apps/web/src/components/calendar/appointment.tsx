import { createContext, useContext, useState, type ReactNode } from "react";
import { useDndContext, useDraggable } from "@dnd-kit/core";

import { openEditSheet } from "./sheet.state";
import type { Appointment } from "./types";
import { minutesTo12Hour, minuteToRow } from "./utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { useLocationHours } from "./calendar";

interface AppointmentContextValue {
  openHover: boolean;
  setOpenHover: (open: boolean) => void;
  openContextMenu: boolean;
  setOpenContextMenu: (open: boolean) => void;
}

const AppointmentContext = createContext<AppointmentContextValue | undefined>(
  undefined,
);

export const AppointmentProvider = ({ children }: { children: ReactNode }) => {
  const [openHover, setOpenHover] = useState(false);
  const [openContextMenu, setOpenContextMenu] = useState(false);

  return (
    <AppointmentContext.Provider
      value={{
        openHover,
        setOpenHover,
        openContextMenu,
        setOpenContextMenu,
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
};

const useAppointment = () => {
  const context = useContext(AppointmentContext);
  if (!context) throw new Error("useAppointment must be used within provider");
  return context;
};

/* ------------------- Appointment ------------------- */

export function Appointment({
  id,
  employeeId,
  start,
  end,
  title,
  customerName,
  price,
  color,
  status,
}: Appointment & { color: string }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    disabled: status !== "SCHEDULED",
    data: { id, empId: employeeId, start, end, title, color },
  });
  const { maxTime, minTime } = useLocationHours();

  const style = transform ? { opacity: 0 } : undefined;

  const appointmentData = {
    id,
    employeeId,
    start,
    end,
    title,
    customerName,
    price,
    status,
  };

  return (
    <AppointmentProvider>
      <ControlledHoverCard appointment={appointmentData}>
        <button
          disabled
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          style={{
            gridRowStart: minuteToRow(start, { start: minTime, end: maxTime }),
            gridRowEnd: minuteToRow(end, { start: minTime, end: maxTime }),
            backgroundColor: color,
            ...style,
          }}
          className="col-span-full overflow-hidden h-full rounded-lg hover:cursor-grab text-xs text-white p-1 z-10 absolute w-full"
        >
          <ControlledContextMenu appointment={appointmentData}>
            <div className="flex relative w-full h-full flex-col text-left hover:cursor-grab">
              <p className="line-clamp-1">{title}</p>
              <p>
                {minutesTo12Hour(start)} - {minutesTo12Hour(end)}
              </p>
              <p className="absolute top-2 right-2 capitalize">
                {appointmentData.status[0] +
                  appointmentData.status.slice(1).toLowerCase()}
              </p>
            </div>
          </ControlledContextMenu>
        </button>
      </ControlledHoverCard>
    </AppointmentProvider>
  );
}

const ControlledHoverCard = ({
  children,
  appointment,
}: {
  children: React.ReactNode;
  appointment: Appointment;
}) => {
  const { openHover, setOpenHover, openContextMenu } = useAppointment();
  const { active } = useDndContext();
  const isDisabled = openContextMenu || Boolean(active?.id); // disable hover card if sheet/context is open

  return (
    <HoverCard
      open={!isDisabled && openHover}
      onOpenChange={(open) => {
        if (isDisabled) return;
        setOpenHover(open);
      }}
      openDelay={500}
    >
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80" role="dialog" aria-modal="true">
        <h3 className="font-semibold">{appointment.title}</h3>
        <p>
          {minutesTo12Hour(appointment.start)} -{" "}
          {minutesTo12Hour(appointment.end)}
        </p>
        <p>Customer: {appointment.customerName}</p>
        <p>Price: ${appointment.price / 100}</p>
      </HoverCardContent>
    </HoverCard>
  );
};

const ControlledContextMenu = ({
  children,
  appointment,
}: {
  children: React.ReactNode;
  appointment: Appointment;
}) => {
  const { setOpenContextMenu } = useAppointment();

  return (
    <ContextMenu onOpenChange={(open) => setOpenContextMenu(open)}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            openEditSheet({
              id: appointment.id,
              empId: appointment.employeeId,
            });
          }}
        >
          Edit
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
