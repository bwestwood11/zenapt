"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

type ThemeOption = (typeof themeOptions)[number]["value"];

export function ThemeToggleOptions({
  className,
  buttonClassName,
}: Readonly<{
  className?: string;
  buttonClassName?: string;
}>) {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme: ThemeOption = mounted
    ? ((theme as ThemeOption | undefined) ?? "system")
    : "system";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const isActive = activeTheme === option.value;

        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={isActive ? "default" : "outline"}
            onClick={() => setTheme(option.value)}
            aria-pressed={isActive}
            className={cn("gap-1.5", buttonClassName)}
          >
            <Icon className="h-3.5 w-3.5" />
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}