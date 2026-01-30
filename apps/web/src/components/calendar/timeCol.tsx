import { useLocationHours } from "./calendar";
import {
 
  ROW_HEIGHT,
  SLOT_MINUTES,
  TOTAL_SLOTS,
} from "./constants";
import { formatMinutes } from "./utils";



export function TimeColumn() {
  const {maxTime, minTime} = useLocationHours()
  const visibleSlots = (maxTime - minTime) / SLOT_MINUTES;

  return (
    <div
      className="grid border-r bg-muted "
      style={{
        gridTemplateRows: `repeat(${visibleSlots}, ${ROW_HEIGHT}px)`,
      }}
    >
      {Array.from({ length: visibleSlots + 1 }).map((_, i) => {
        const minutes = minTime + i * SLOT_MINUTES;
        const { isHour, formattedTime } = formatMinutes(minutes);
        return (
          <div key={i} className={isHour ? "border-t px-2" : ""}>
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
