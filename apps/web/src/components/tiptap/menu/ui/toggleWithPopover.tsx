"use client";

import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EditorPopoverButtonProps = {
  icon: React.ReactNode;
  label: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
};

export const EditorPopoverButton: React.FC<EditorPopoverButtonProps> = ({
  icon,
  label,
  placeholder = "",
  onSubmit,
}) => {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

  const handleSubmit = () => {
    if (!value) return;
    onSubmit(value);
    setValue("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label={label}>
          {icon}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-60 p-0 bg-input/30">
        <div className="flex gap-2 flex-1">
          <Input
            placeholder={placeholder || label}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className="bg-transparent border-none shadow-none focus:ring-0 focus:outline-none focus:border-none"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            autoFocus
          />

          <Button onClick={handleSubmit} size="sm">
            {label}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
