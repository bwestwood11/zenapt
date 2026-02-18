import { cn } from "@/lib/utils";
import  {motion}  from "motion/react";

interface AvailableTimesSectionProps {
  date: Date;
  timings: Array<{ start: Date; end: Date }> | undefined;
  selectedRange: { start: Date; end: Date } | null;
  onTimeSelect: (range: { start: Date; end: Date }) => void;
}


export const AvailableTimesSection = ({
  date,
  timings,
  selectedRange,
  onTimeSelect,
}: AvailableTimesSectionProps) => {
  console.log("AvailableTimesSection render", { date, timings, selectedRange });
  return (
    <div className="w-full">
      <div className="space-y-3">
        <h3 className="text-sidebar-foreground font-medium">Available Times</h3>
        <p className="text-sidebar-foreground/60 text-sm">
          {date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <div className="grid grid-cols-2 gap-2 min-h-[200px] max-h-[280px] overflow-y-auto pr-2">
          {timings && timings.length > 0 ? (
            timings.map((time, index) => {
              const isSelected =
                !!selectedRange &&
                selectedRange.start.getTime() === time.start.getTime();

              return (
                <motion.button
                  key={time.start.toISOString()}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.15,
                    delay: Math.min(index * 0.02, 0.3),
                    ease: "easeOut",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    onTimeSelect({ start: time.start, end: time.end })
                  }
                  className={cn(
                    "py-2.5 px-3 rounded-lg border-2 transition-all duration-150 text-sm font-medium",
                    isSelected
                      ? "bg-accent border-accent text-accent-foreground shadow-sm"
                      : "bg-sidebar-accent/20 border-sidebar-border text-sidebar-foreground hover:border-accent/50 hover:bg-accent/10",
                  )}
                >
                  {time.start.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {time.end.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </motion.button>
              );
            })
          ) : (
            <div className="col-span-2 flex items-center justify-center h-[200px] text-sm text-muted-foreground">
              <div className="text-center">
                <p className="font-medium">No available time slots</p>
                <p className="text-xs mt-1">Try selecting a different date</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
