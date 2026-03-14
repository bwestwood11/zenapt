import { useLocationHours } from "./calendar";
import {
  ROW_HEIGHT,
  SLOT_MINUTES,
} from "./constants";
import { formatMinutes } from "./utils";

export function TimeColumn({
  locationTimeZone,
}: Readonly<{
  locationTimeZone: string;
}>) {
  const { maxTime, minTime } = useLocationHours();
  const visibleSlots = (maxTime - minTime) / SLOT_MINUTES;

  return (
    <div
      className="grid border-r bg-muted "
      title={`Times shown in ${locationTimeZone}`}
      style={{
        gridTemplateRows: `repeat(${visibleSlots}, ${ROW_HEIGHT}px)`,
      }}
    >
      {Array.from({ length: visibleSlots + 1 }).map((_, i) => {
        const minutes = minTime + i * SLOT_MINUTES;
        const { isHour, formattedTime } = formatMinutes(minutes);
        return (
          <div key={minutes} className={isHour ? "border-t px-2" : ""}>
            {isHour && (
              <span className="text-xs text-muted-foreground">
                {formattedTime}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
