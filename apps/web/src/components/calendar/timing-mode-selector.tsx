import { Button } from "../ui/button";
import { motion } from "framer-motion";

type TimingMode = "available" | "custom";

interface TimingModeSelectorProps {
  selectedMode: TimingMode;
  onModeChange: (mode: TimingMode) => void;
}

export const TimingModeSelector = ({
  selectedMode,
  onModeChange,
}: TimingModeSelectorProps) => {
  return (
    <div className="relative flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
      <motion.div
        className="absolute bg-background rounded-md shadow-sm"
        layoutId="active-mode"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          left: selectedMode === "available" ? "4px" : "50%",
          width:
            selectedMode === "available"
              ? "calc(50% - 4px)"
              : "calc(50% - 4px)",
          height: "calc(100% - 8px)",
          top: "4px",
        }}
      />
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onModeChange("available")}
        className={`text-xs relative z-10 transition-colors ${
          selectedMode === "available"
            ? "text-foreground"
            : "text-muted-foreground"
        }`}
      >
        Available Times
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onModeChange("custom")}
        className={`text-xs relative z-10 transition-colors ${
          selectedMode === "custom"
            ? "text-foreground"
            : "text-muted-foreground"
        }`}
      >
        Custom Time
      </Button>
    </div>
  );
};
