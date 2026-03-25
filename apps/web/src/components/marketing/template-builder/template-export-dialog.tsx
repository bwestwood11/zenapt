import type { LucideIcon } from "lucide-react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { TemplateExportType } from "./use-marketing-template-builder";

type TemplateExportDialogProps = Readonly<{
  copyLabel: string;
  copiedField: TemplateExportType | null;
  description: string;
  icon: LucideIcon;
  onCopy: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  placeholder: string;
  title: string;
  value: string;
  variant: TemplateExportType;
}>;

export function TemplateExportDialog({
  copyLabel,
  copiedField,
  description,
  icon: Icon,
  onCopy,
  onOpenChange,
  open,
  placeholder,
  title,
  value,
  variant,
}: TemplateExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(92vw,900px)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            readOnly
            value={value}
            placeholder={placeholder}
            className="min-h-[60vh] resize-none rounded-2xl bg-muted/30 font-mono text-xs"
          />
          <div className="flex justify-end">
            <Button onClick={onCopy} disabled={!value}>
              {copiedField === variant ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copyLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
