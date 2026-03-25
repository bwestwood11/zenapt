"use client";

import dynamic from "next/dynamic";
import type { EmailEditorProps } from "react-email-editor";
import { Code2, FileJson2 } from "lucide-react";
import { TemplateExportDialog } from "./template-builder/template-export-dialog";
import { TemplateBuilderToolbar } from "./template-builder/template-builder-toolbar";
import { useMarketingTemplateBuilder } from "./template-builder/use-marketing-template-builder";

const EmailEditor = dynamic(
  async () => (await import("react-email-editor")).default,
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[720px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
        Loading template builder...
      </div>
    ),
  },
) as typeof import("react-email-editor").default;

const editorMinHeight = "calc(100vh - 8.5rem)";

const editorOptions: EmailEditorProps["options"] = {
  appearance: {
    theme: "modern_light",
    panels: {
      tools: {
        dock: "left",
      },
    },
  },
  displayMode: "email",
  version: "latest",
};

const projectId = Number(process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID);

if (!Number.isNaN(projectId) && projectId > 0) {
  editorOptions.projectId = projectId;
}

export function MarketingTemplateBuilder() {
  const {
    containerRef,
    copiedField,
    designOutput,
    editorRef,
    exportModal,
    handleCopy,
    handleExportHtml,
    handleReady,
    handleSaveDesign,
    htmlOutput,
    isFullscreen,
    isReady,
    isSavingTemplate,
    lastExportLabel,
    setExportModal,
    templateDescription,
    templateTitle,
    toggleFullscreen,
    updateTemplateMeta,
  } = useMarketingTemplateBuilder();

  return (
    <div
      ref={containerRef}
      className={[
        "relative overflow-hidden border border-border/60 bg-card shadow-sm transition-all",
        isFullscreen ? "h-screen rounded-none border-0" : "min-h-[calc(100vh-2rem)] rounded-[28px]",
      ].join(" ")}
    >
      <TemplateBuilderToolbar
        isFullscreen={isFullscreen}
        isReady={isReady}
        isSavingTemplate={isSavingTemplate}
        lastExportLabel={lastExportLabel}
        onExportHtml={handleExportHtml}
        onSaveDesign={handleSaveDesign}
        onToggleFullscreen={toggleFullscreen}
        onUpdateTemplateMeta={updateTemplateMeta}
        templateDescription={templateDescription}
        templateTitle={templateTitle}
      />

      <div className={isFullscreen ? "relative h-[calc(100vh-57px)] min-h-0 bg-muted/10" : "relative min-h-0 bg-muted/10"}>
        <EmailEditor
          minHeight={isFullscreen ? "calc(100vh - 57px)" : editorMinHeight}
          onReady={handleReady}
          options={editorOptions}
          ref={editorRef}
        />
      </div>

      <TemplateExportDialog
        copyLabel="Copy HTML"
        copiedField={copiedField}
        description="Copy the final HTML for your campaign or downstream email integration."
        icon={Code2}
        onCopy={() => handleCopy(htmlOutput, "html")}
        onOpenChange={(open) => setExportModal(open ? "html" : null)}
        open={exportModal === "html"}
        placeholder="Exported HTML appears here."
        title="Published HTML"
        value={htmlOutput}
        variant="html"
      />

      <TemplateExportDialog
        copyLabel="Copy JSON"
        copiedField={copiedField}
        description="Reuse this JSON to restore the same template structure later."
        icon={FileJson2}
        onCopy={() => handleCopy(designOutput, "json")}
        onOpenChange={(open) => setExportModal(open ? "json" : null)}
        open={exportModal === "json"}
        placeholder="Saved design JSON appears here."
        title="Saved design JSON"
        value={designOutput}
        variant="json"
      />
    </div>
  );
}

type MarketingTemplateBuilderProps = Readonly<{
  templateId?: string;
}>;

export function MarketingTemplateBuilderWithTemplate({
  templateId,
}: MarketingTemplateBuilderProps) {
  const {
    containerRef,
    copiedField,
    designOutput,
    editorRef,
    exportModal,
    handleCopy,
    handleExportHtml,
    handleReady,
    handleSaveDesign,
    htmlOutput,
    isFullscreen,
    isReady,
    isSavingTemplate,
    lastExportLabel,
    setExportModal,
    templateDescription,
    templateTitle,
    toggleFullscreen,
    updateTemplateMeta,
  } = useMarketingTemplateBuilder(templateId);

  return (
    <div
      ref={containerRef}
      className={[
        "relative overflow-hidden border border-border/60 bg-card shadow-sm transition-all",
        isFullscreen ? "h-screen rounded-none border-0" : "min-h-[calc(100vh-2rem)] rounded-[28px]",
      ].join(" ")}
    >
      <TemplateBuilderToolbar
        isFullscreen={isFullscreen}
        isReady={isReady}
        isSavingTemplate={isSavingTemplate}
        lastExportLabel={lastExportLabel}
        onExportHtml={handleExportHtml}
        onSaveDesign={handleSaveDesign}
        onToggleFullscreen={toggleFullscreen}
        onUpdateTemplateMeta={updateTemplateMeta}
        templateDescription={templateDescription}
        templateTitle={templateTitle}
      />

      <div className={isFullscreen ? "relative h-[calc(100vh-57px)] min-h-0 bg-muted/10" : "relative min-h-0 bg-muted/10"}>
        <EmailEditor
          minHeight={isFullscreen ? "calc(100vh - 57px)" : editorMinHeight}
          onReady={handleReady}
          options={editorOptions}
          ref={editorRef}
        />
      </div>

      <TemplateExportDialog
        copyLabel="Copy HTML"
        copiedField={copiedField}
        description="Copy the final HTML for your campaign or downstream email integration."
        icon={Code2}
        onCopy={() => handleCopy(htmlOutput, "html")}
        onOpenChange={(open) => setExportModal(open ? "html" : null)}
        open={exportModal === "html"}
        placeholder="Exported HTML appears here."
        title="Published HTML"
        value={htmlOutput}
        variant="html"
      />

      <TemplateExportDialog
        copyLabel="Copy JSON"
        copiedField={copiedField}
        description="Reuse this JSON to restore the same template structure later."
        icon={FileJson2}
        onCopy={() => handleCopy(designOutput, "json")}
        onOpenChange={(open) => setExportModal(open ? "json" : null)}
        open={exportModal === "json"}
        placeholder="Saved design JSON appears here."
        title="Saved design JSON"
        value={designOutput}
        variant="json"
      />
    </div>
  );
}