import { Toggle } from "@/components/ui/toggle";

type EditorToggleProps = {
  icon: React.ReactNode;
  isActive: () => boolean;
  action: () => void;
  disabled?: boolean;
};

export const EditorToggle = ({
  icon,
  isActive,
  action,
  disabled,
}: EditorToggleProps) => (
  <Toggle
    size="sm"
    pressed={isActive()}
    disabled={disabled}
    onPressedChange={() => action()}
  >
    {icon}
  </Toggle>
);
