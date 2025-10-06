"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type EditorIconButtonProps = {
  icon: React.ReactNode;
  label: string;
  isActive?: () => boolean;
  onClick: () => void;
  disabled?: boolean;
};

export const EditorIconButton = ({
  icon,
  label,
  isActive,
  onClick,
  disabled,
}: EditorIconButtonProps) => {
  const active = isActive?.() ?? false;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant={active ? "default" : "ghost"} // active looks filled, otherwise ghost
            onClick={onClick}
            disabled={disabled}
            className="p-1"
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
