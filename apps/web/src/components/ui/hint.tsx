import {
  Tooltip as ShadcnToolTip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
interface HintProps {
  defaultOpen?: boolean;
  delayDuration?: number;
  onOpenChange?: (isOpen: boolean) => void;
  open?: boolean;
  content: React.ReactNode | string;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left" | undefined;
  sideOffset?: number | undefined;
}

export function Hint({
  content,
  children,
  delayDuration = 300,
  side,
  sideOffset,
  ...options
}: HintProps) {
  return (
    <TooltipProvider>
      <ShadcnToolTip delayDuration={delayDuration} {...options}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          className="z-[3000]"
          side={side}
          sideOffset={sideOffset}
        >
          <span>{content}</span>
        </TooltipContent>
      </ShadcnToolTip>
    </TooltipProvider>
  );
}