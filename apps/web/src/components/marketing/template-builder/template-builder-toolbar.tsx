"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, Download, FileJson2, Maximize2, Minimize2, Pencil } from "lucide-react";

type TemplateBuilderToolbarProps = Readonly<{
  isFullscreen: boolean;
  isReady: boolean;
  isSavingTemplate: boolean;
  lastExportLabel: string | null;
  onExportHtml: () => void;
  onSaveDesign: () => void;
  onToggleFullscreen: () => void | Promise<void>;
  onUpdateTemplateMeta: (title: string, description: string) => void;
  templateDescription: string;
  templateTitle: string;
}>;

export function TemplateBuilderToolbar({
  isFullscreen,
  isReady,
  isSavingTemplate,
  lastExportLabel,
  onExportHtml,
  onSaveDesign,
  onToggleFullscreen,
  onUpdateTemplateMeta,
  templateDescription,
  templateTitle,
}: TemplateBuilderToolbarProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(templateTitle);
  const [draftDescription, setDraftDescription] = useState(templateDescription);

  useEffect(() => {
    setDraftTitle(templateTitle);
  }, [templateTitle]);

  useEffect(() => {
    setDraftDescription(templateDescription);
  }, [templateDescription]);

  const handleSaveMeta = () => {
    onUpdateTemplateMeta(draftTitle, draftDescription);
    setIsPopoverOpen(false);
  };

  return (
    <div className="z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur sm:px-5">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground sm:text-base">
              {templateTitle || "Title"}
            </p>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Edit template details">
                  <Pencil className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Template details</p>
                  <p className="text-xs text-muted-foreground">
                    Update the template name and description shown in the builder.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-title">Name</Label>
                  <Input
                    id="template-title"
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    placeholder="Title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-description">Description</Label>
                  <Textarea
                    id="template-description"
                    value={draftDescription}
                    onChange={(event) => setDraftDescription(event.target.value)}
                    placeholder="Short description"
                    className="min-h-24"
                  />
                </div>

                <div className="flex justify-end">
                  <Button size="sm" onClick={handleSaveMeta}>
                    Save details
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <p className="truncate text-xs text-muted-foreground">
            {templateDescription || "Add a description for this template."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {isReady ? "Ready" : "Loading"}
          </Badge>
          {lastExportLabel ? (
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {lastExportLabel}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>

        <div className="flex items-center">
          <Button
            size="sm"
            onClick={onExportHtml}
            disabled={!isReady || isSavingTemplate}
            isLoading={isSavingTemplate}
            className="rounded-r-none"
          >
            <Download className="h-4 w-4" />
            Save & publish
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                disabled={!isReady || isSavingTemplate}
                className="rounded-l-none border-l border-l-primary-foreground/20 px-2"
                aria-label="Open export options"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onExportHtml}>
                <Download className="h-4 w-4" />
                Save & publish
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSaveDesign}>
                <FileJson2 className="h-4 w-4" />
                Save JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
