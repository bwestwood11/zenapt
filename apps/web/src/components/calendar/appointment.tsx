import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useDndContext, useDraggable } from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
import { Button } from "../ui/button";
import { useLocationHours } from "./calendar";
import { ChargeBalanceModal } from "./charge-balance-modal";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

interface AppointmentContextValue {
  openHover: boolean;
  setOpenHover: (open: boolean) => void;
  openContextMenu: boolean;
  setOpenContextMenu: (open: boolean) => void;
}

interface AppointmentChargeModalContextValue {
  openChargeModal: (appointmentId: string) => void;
}

const AppointmentContext = createContext<AppointmentContextValue | undefined>(
  undefined,
);

const AppointmentChargeModalContext =
  createContext<AppointmentChargeModalContextValue | undefined>(undefined);

export const AppointmentChargeModalProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(
    null,
  );

  const value = useMemo(
    () => ({
      openChargeModal: (appointmentId: string) => {
        setSelectedAppointmentId(appointmentId);
        setChargeModalOpen(true);
      },
    }),
    [],
  );

  return (
    <AppointmentChargeModalContext.Provider value={value}>
      {children}
      {selectedAppointmentId ? (
        <ChargeBalanceModal
          open={chargeModalOpen}
          onOpenChange={setChargeModalOpen}
          appointmentId={selectedAppointmentId}
        />
      ) : null}
    </AppointmentChargeModalContext.Provider>
  );
};

export const AppointmentProvider = ({ children }: { children: ReactNode }) => {
  const [openHover, setOpenHover] = useState(false);
  const [openContextMenu, setOpenContextMenu] = useState(false);
  const value = useMemo(
    () => ({ openHover, setOpenHover, openContextMenu, setOpenContextMenu }),
    [openHover, openContextMenu],
  );

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
};

const useAppointment = () => {
  const context = useContext(AppointmentContext);
  if (!context) throw new Error("useAppointment must be used within provider");
  return context;
};

const useAppointmentChargeModal = () => {
  const context = useContext(AppointmentChargeModalContext);
  if (!context) {
    throw new Error(
      "useAppointmentChargeModal must be used within AppointmentChargeModalProvider",
    );
  }
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
  serviceNames,
  price,
  color,
  status,
  paymentStatus,
  bufferTime,
  prepTime,
  actorRoleAtLocation,
  actorEmployeeIdAtLocation,
}: Appointment & {
  color: string;
  actorRoleAtLocation: string | null;
  actorEmployeeIdAtLocation: string | null;
}) {
  const queryClient = useQueryClient();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    disabled: status !== "SCHEDULED",
    data: {
      id,
      empId: employeeId,
      start,
      end,
      title,
      color,
      prepTime,
      bufferTime,
    },
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
    serviceNames,
    price,
    status,
    paymentStatus,
    bufferTime,
    prepTime,
  };

  const isSpecialist = actorRoleAtLocation === "LOCATION_SPECIALIST";
  const canSyncPayments = !isSpecialist || actorEmployeeIdAtLocation === employeeId;
  const canMarkNoShow = status === "SCHEDULED" || status === "RESCHEDULED";

  const { mutate: syncPayments, isPending: isSyncingPayments } = useMutation(
    trpc.appointment.syncAppointmentPaymentsFromStripe.mutationOptions({
      onSuccess: (result) => {
        toast.success("Appointment payment sync completed", {
          description: `Payment status: ${result.appointmentPaymentStatus}`,
        });
        queryClient.invalidateQueries({
          queryKey: trpc.appointment.fetchAppointments.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.appointment.getAppointmentChargeSummary.queryKey({
            appointmentId: id,
          }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to sync appointment payments");
      },
    }),
  );

  const { mutate: updateStatus, isPending: isUpdatingStatus } = useMutation(
    trpc.appointment.updateAppointmentStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Appointment marked as no-show");
        queryClient.invalidateQueries({
          queryKey: trpc.appointment.fetchAppointments.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update appointment status");
      },
    }),
  );

  const borderStart = prepTime > 0 ? start - prepTime : start;
  const borderEnd = bufferTime > 0 ? end + bufferTime : end;

  return (
    <AppointmentProvider>
      <>
        {/* Border Container */}
        <div
          style={{
            gridRowStart: minuteToRow(borderStart, {
              start: minTime,
              end: maxTime,
            }),
            gridRowEnd: minuteToRow(borderEnd, {
              start: minTime,
              end: maxTime,
            }),
            opacity: transform ? 0 : 1,
            boxShadow: `inset 0 0 0 2px ${color}`,
            borderRadius: "0.5rem",
          }}
          className="col-span-full w-full relative z-20 pointer-events-none"
        />

        {/* Prep Time */}
        {prepTime > 0 && (
          <div
            style={{
              gridRowStart: minuteToRow(start - prepTime, {
                start: minTime,
                end: maxTime,
              }),
              gridRowEnd: minuteToRow(start, { start: minTime, end: maxTime }),
              backgroundColor: color,
              backgroundImage: `repeating-linear-gradient(
                -45deg,
                rgba(255, 255, 255, 0.25),
                rgba(255, 255, 255, 0.25) 8px,
                transparent 8px,
                transparent 20px
              )`,
              opacity: transform ? 0 : 1,
            }}
            className="col-span-full w-full relative z-10"
          >
            {prepTime > 5 && (
              <div className="absolute top-1 left-2 text-[9px] font-semibold uppercase tracking-wider text-white drop-shadow-sm">
                Prep {prepTime}m
              </div>
            )}
          </div>
        )}

        {/* Main Appointment */}
        <ControlledHoverCard
          appointment={appointmentData}
          canMarkNoShow={canMarkNoShow}
          canSyncPayments={canSyncPayments}
          isSyncingPayments={isSyncingPayments}
          isUpdatingStatus={isUpdatingStatus}
          onMarkNoShow={() => {
            updateStatus({
              appointmentId: id,
              status: "NO_SHOW",
            });
          }}
          onSyncPayments={() => {
            syncPayments({ appointmentId: id });
          }}
        >
          <button
            
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={{
              gridRowStart: minuteToRow(start, {
                start: minTime,
                end: maxTime,
              }),
              gridRowEnd: minuteToRow(end, { start: minTime, end: maxTime }),
              backgroundColor: color,
              ...style,
            }}
            className="col-span-full overflow-hidden h-full hover:cursor-grab text-xs text-white p-1 z-10 w-full shadow-sm"
          >
            <ControlledContextMenu
              appointment={appointmentData}
              canMarkNoShow={canMarkNoShow}
              canSyncPayments={canSyncPayments}
              isSyncingPayments={isSyncingPayments}
              isUpdatingStatus={isUpdatingStatus}
              onMarkNoShow={() => {
                updateStatus({
                  appointmentId: id,
                  status: "NO_SHOW",
                });
              }}
              onSyncPayments={() => {
                syncPayments({ appointmentId: id });
              }}
            >
              <div className="flex relative w-full h-full flex-col text-left hover:cursor-grab gap-0.5">
                <p className="font-semibold text-sm line-clamp-1">{title}</p>
                <p className="text-xs font-medium">
                  {minutesTo12Hour(start)} - {minutesTo12Hour(end)}
                </p>
                <p className="text-[11px] opacity-80 line-clamp-1 mt-0.5">
                  {serviceNames.join(", ")}
                </p>
                <p className="absolute top-1.5 right-1.5 text-[10px] font-medium capitalize px-1.5 py-0.5 bg-white/20 rounded">
                  {appointmentData.status[0] +
                    appointmentData.status.slice(1).toLowerCase()}
                </p>
                <p className="absolute top-7 right-1.5 text-[10px] font-medium px-1.5 py-0.5 bg-black/20 rounded uppercase">
                  {appointmentData.paymentStatus.replaceAll("_", " ")}
                </p>
              </div>
            </ControlledContextMenu>
          </button>
        </ControlledHoverCard>

        {/* Buffer Time */}
        {bufferTime > 0 && (
          <div
            style={{
              gridRowStart: minuteToRow(end, { start: minTime, end: maxTime }),
              gridRowEnd: minuteToRow(end + bufferTime, {
                start: minTime,
                end: maxTime,
              }),
              backgroundColor: color,
              backgroundImage: `repeating-linear-gradient(
                -45deg,
                rgba(255, 255, 255, 0.25),
                rgba(255, 255, 255, 0.25) 8px,
                transparent 8px,
                transparent 20px
              )`,
              opacity: transform ? 0 : 1,
            }}
            className="col-span-full w-full relative z-10"
          >
            {bufferTime > 5 && (
              <div className="absolute bottom-1 left-2 text-[9px] font-semibold uppercase tracking-wider text-white drop-shadow-sm">
                Buffer {bufferTime}m
              </div>
            )}
          </div>
        )}
      </>
    </AppointmentProvider>
  );
}

const ControlledHoverCard = ({
  children,
  appointment,
  canMarkNoShow,
  canSyncPayments,
  isSyncingPayments,
  isUpdatingStatus,
  onMarkNoShow,
  onSyncPayments,
}: {
  children: React.ReactNode;
  appointment: Appointment;
  canMarkNoShow: boolean;
  canSyncPayments: boolean;
  isSyncingPayments: boolean;
  isUpdatingStatus: boolean;
  onMarkNoShow: () => void;
  onSyncPayments: () => void;
}) => {
  const { openHover, setOpenHover, openContextMenu } = useAppointment();
  const { openChargeModal } = useAppointmentChargeModal();
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
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-base">{appointment.title}</h3>
            <p className="text-sm text-muted-foreground">
              {appointment.customerName}
            </p>
            <p className="text-sm font-medium text-foreground mt-1">
              {appointment.serviceNames.join(", ")}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Appointment:</span>
              <span className="font-medium">
                {minutesTo12Hour(appointment.start)} -{" "}
                {minutesTo12Hour(appointment.end)}
              </span>
            </div>

            {appointment.prepTime > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prep Time:</span>
                <span>{appointment.prepTime} min</span>
              </div>
            )}

            {appointment.bufferTime > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Buffer Time:</span>
                <span>{appointment.bufferTime} min</span>
              </div>
            )}

            {(appointment.prepTime > 0 || appointment.bufferTime > 0) && (
              <div className="flex justify-between text-sm pt-1 border-t">
                <span className="text-muted-foreground font-medium">
                  Overall Time:
                </span>
                <span className="font-medium">
                  {minutesTo12Hour(appointment.start - appointment.prepTime)} -{" "}
                  {minutesTo12Hour(appointment.end + appointment.bufferTime)}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">Price:</span>
            <span className="font-semibold">
              ${(appointment.price / 100).toFixed(2)}
            </span>
          </div>

          <div className="pt-2 border-t">
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={appointment.status === "CANCELED"}
              onClick={() => {
                setOpenHover(false);
                openChargeModal(appointment.id);
              }}
            >
              Charge Remaining + Tip
            </Button>
          </div>

          <div className="pt-2 border-t flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={!canSyncPayments || isSyncingPayments}
              onClick={onSyncPayments}
            >
              {isSyncingPayments ? "Syncing..." : "Sync Payments"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="flex-1"
              disabled={!canMarkNoShow || isUpdatingStatus}
              onClick={onMarkNoShow}
            >
              {isUpdatingStatus ? "Updating..." : "Mark No Show"}
            </Button>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

const ControlledContextMenu = ({
  children,
  appointment,
  canMarkNoShow,
  canSyncPayments,
  isSyncingPayments,
  isUpdatingStatus,
  onMarkNoShow,
  onSyncPayments,
}: {
  children: React.ReactNode;
  appointment: Appointment;
  canMarkNoShow: boolean;
  canSyncPayments: boolean;
  isSyncingPayments: boolean;
  isUpdatingStatus: boolean;
  onMarkNoShow: () => void;
  onSyncPayments: () => void;
}) => {
  const { setOpenContextMenu } = useAppointment();
  const { openChargeModal } = useAppointmentChargeModal();

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
        <ContextMenuItem
          disabled={appointment.status === "CANCELED"}
          onClick={() => {
            openChargeModal(appointment.id);
          }}
        >
          Charge Remaining + Tip
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canSyncPayments || isSyncingPayments}
          onClick={onSyncPayments}
        >
          {isSyncingPayments ? "Syncing Payments..." : "Sync Payments"}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canMarkNoShow || isUpdatingStatus}
          onClick={onMarkNoShow}
        >
          {isUpdatingStatus ? "Updating Status..." : "Mark No Show"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
