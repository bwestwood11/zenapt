import { useDroppable } from "@dnd-kit/core";
import { CalendarClock, Clock, Coffee } from "lucide-react";
import { Appointment } from "./appointment";
import { ROW_HEIGHT, SLOT_MINUTES } from "./constants";
import { useEmployeeAppointments } from "./store/appointments";
import type {
  Break,
  DragData,
  DropData,
  Employee,
  WorkingEmployee,
} from "./types";
import { getColorFromEmployeeName, minuteToRow } from "./utils";
import { useLocationHours } from "./calendar";
import { openAddAppointmentDialog } from "./add-appointment.state";
import { useCalendarPreferencesStore } from "./store/preference";
import { cn } from "@/lib/utils";

/* ------------------- WorkTime Component ------------------- */
function SlotPlaceholder() {
  return (
    <div
      className="w-full h-full border border-b border-border/70 "
      style={{}}
    />
  );
}

export function WorkTime({
  empId,
  start,
  end,
  color,
}: {
  empId: string;
  start: number;
  end: number;
  color: string;
}) {
  const { maxTime, minTime } = useLocationHours();

  const totalSlots = (maxTime - minTime) / SLOT_MINUTES;

  const workStartRow = minuteToRow(start, { start: minTime, end: maxTime });
  const workEndRow = minuteToRow(end, { start: minTime, end: maxTime });

  return (
    <div
      className="col-span-full row-span-full grid z-0"
      style={{
        gridTemplateRows: `repeat(${totalSlots}, ${ROW_HEIGHT}px)`,
      }}
    >
      {Array.from({ length: totalSlots }).map((_, i) => {
        const row = i + 1;
        const slotMinute = minTime + i * SLOT_MINUTES;

        const isWorkTime = row >= workStartRow && row < workEndRow;

        return isWorkTime ? (
          <SlotDropable
            key={row}
            id={`emp-${empId}-slot-${slotMinute}`}
            row={row}
            empId={empId}
            start={slotMinute}
            color={color}
            isFirst={row === workStartRow} // first active slot
            isLast={row === workEndRow - 1} // last active slot
          />
        ) : (
          <SlotPlaceholder key={row} />
        );
      })}
    </div>
  );
}

/* ------------------- SlotDropable ------------------- */
export function SlotDropable({
  id,
  row,
  empId,
  start,
  color,
  isFirst = false, // new prop to indicate first slot
  isLast = false, // new prop to indicate last slot
}: {
  id: string;
  row: number;
  empId: string;
  start: number;
  color: string;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const { isOver, setNodeRef, over, active } = useDroppable({
    id,
    data: { empId, start } satisfies DropData,
  });
  const enabledAddAppointment = useCalendarPreferencesStore(
    (state) => state.clickToAddAppointment,
  );

  const activeData = active?.data.current as DragData | undefined;
  const overData = over?.data.current as DropData | undefined;

  const isHover = (() => {
    if (!overData || !activeData) return false;
    if (overData.empId !== empId) return false;

    if (isOver) return true;

    const duration = activeData.end - activeData.start;
    const overEnd = overData.start + duration;
    return start >= overData.start && start < overEnd;
  })();

  const borderRadius = `${isFirst ? "0.5rem" : "0"} ${isFirst ? "0.5rem" : "0"} ${isLast ? "0.5rem" : "0"} ${isLast ? "0.5rem" : "0"}`;
  const Component = enabledAddAppointment ? "button" : "div";
  return (
    <Component
      ref={setNodeRef}
      className={cn(
        "w-full border border-b",
        enabledAddAppointment
          ? "cursor-pointer hover:opacity-80 transition-opacity"
          : "",
      )}
      onClick={
        enabledAddAppointment
          ? () => openAddAppointmentDialog({ empId, start })
          : undefined
      }
      style={{
        gridRowStart: row,
        gridRowEnd: row + 1,
        height: ROW_HEIGHT,
        background: isHover
          ? color
          : `hsl(from ${color} h s calc(l * 0.7) / 0.25)`,
        opacity: isHover ? 0.7 : undefined,
        borderRadius,
        borderColor: `hsl(from ${color} h s calc(l * 0.9) / 0.15)`,
      }}
    />
  );
}

const ICON_MAP: Record<Break["type"], React.ElementType> = {
  food: Coffee,
  other: Clock,
  busy: CalendarClock,
};

export function Break({ start, end, title, type }: Break) {
  const { maxTime, minTime } = useLocationHours();
  const noOfSpans = (end - start) / 15;
  const Icon = ICON_MAP[type] ?? CalendarClock;

  return (
    <div
      style={{
        gridRowStart: minuteToRow(start, { start: minTime, end: maxTime }),
        gridRowEnd: minuteToRow(end, { start: minTime, end: maxTime }),
      }}
      className="col-span-full flex px-1 w-full"
    >
      <div
        className={`bg-red-500 flex justify-center items-center gap-1 text-white text-xs z-20 w-full ${
          noOfSpans === 1 ? "rounded-sm" : "rounded-lg"
        }

        ${noOfSpans > 1 ? "flex-col" : "flex-row"}
        
        `}
        style={{
          backgroundColor: `hsl(from var(--color-red-500) h s calc(l * 0.5))`,
        }}
      >
        <Icon
          className={`${noOfSpans > 1 ? "size-4" : "size-3"} text-white/80 `}
        />
        <p>{title}</p>
      </div>
    </div>
  );
}

/* ------------------- EmployeeColumn ------------------- */
export function EmployeeColumn({
  emp,
  actorRoleAtLocation,
  actorEmployeeIdAtLocation,
}: {
  emp: WorkingEmployee;
  actorRoleAtLocation: string | null;
  actorEmployeeIdAtLocation: string | null;
}) {
  const { maxTime, minTime } = useLocationHours();
  const appointments = useEmployeeAppointments(emp.employee.id);
  // const data = active?.data.current as DragData | undefined
  console.log("employee", emp);
  // console.log(over?.data.current)
  return (
    <div
      className="relative grid bg-muted"
      style={{
        gridTemplateRows: `repeat(${(maxTime - minTime) / SLOT_MINUTES}, ${ROW_HEIGHT}px)`,
      }}
    >
      <WorkTime
        empId={emp.employee.id}
        start={emp.workHours.startMinute}
        end={emp.workHours.endMinute}
        color={getColorFromEmployeeName(emp.employee.name)}
      />

      {appointments?.map((a) => (
        <Appointment
          key={a.id}
          {...a}
          color={getColorFromEmployeeName(emp.employee.name)}
          actorRoleAtLocation={actorRoleAtLocation}
          actorEmployeeIdAtLocation={actorEmployeeIdAtLocation}
        />
      ))}

      {emp.breaks.map((b, i) => (
        <Break
          key={i}
          start={b.startMinute}
          end={b.endMinute}
          title={"break"}
          type={"food"}
        />
      ))}
    </div>
  );
}

export function AbsentEmployeeColumn() {
  const { maxTime, minTime } = useLocationHours();
  const totalSlots = (maxTime - minTime) / SLOT_MINUTES;

  return (
    <div
      className="relative grid bg-muted"
      style={{
        gridTemplateRows: `repeat(${totalSlots}, ${ROW_HEIGHT}px)`,
      }}
    >
      {/* grid lines */}
      {Array.from({ length: totalSlots }).map((_, i) => (
        <div
          key={i}
          className="w-full border border-b border-border/60 bg-muted/30"
          style={{ height: ROW_HEIGHT }}
        />
      ))}

      {/* gray overlay */}
      <div className="absolute inset-0 bg-muted/60 backdrop-grayscale pointer-events-none" />

      {/* optional label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none"></div>
    </div>
  );
}
