import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Toggle } from "@/components/ui/toggle";
import { ChevronDown, Type } from "lucide-react";

type EditorDropdownItem = {
  label: string;
  action: () => void;
  icon?: React.ReactNode;
};

type EditorDropdownProps = {
  items: EditorDropdownItem[];
  getActiveLabel: () => string;
  getActiveIcon?: () => React.ReactNode;
};

export const EditorDropdown = ({
  items,
  getActiveLabel,
  getActiveIcon,
}: EditorDropdownProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Toggle size="sm" pressed={true}>
        <div className="flex items-center gap-1">
          {getActiveIcon?.() ?? <Type className="h-4 w-4" />}
          <span className="sr-only">{getActiveLabel()}</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      </Toggle>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      {items.map((item, idx) => (
        <DropdownMenuItem
          key={idx}
          onClick={item.action}
          className="flex items-center gap-2"
        >
          {item.icon}
          {item.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);
