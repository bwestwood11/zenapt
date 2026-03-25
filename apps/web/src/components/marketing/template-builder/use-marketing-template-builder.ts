"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { EditorRef, EmailEditorProps } from "react-email-editor";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import type { AppRouter } from "../../../../../server/src/routers";
import { useFullscreenElement } from "./use-fullscreen-element";

export type TemplateExportType = "html" | "json";

type ExportHtmlResult = {
  design: object;
  html: string;
};

type SavedDesign = object;

type MarketingRouterOutput = inferRouterOutputs<AppRouter>["marketing"];
type MarketingTemplate = MarketingRouterOutput["getEmailTemplateById"];

const formatExportTime = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const templateEditorBasePath = "/dashboard/marketing/templates";

export function useMarketingTemplateBuilder(templateIdParam?: string) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorRef | null>(null);
  const hasLoadedInitialTemplateRef = useRef(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState("Title");
  const [templateDescription, setTemplateDescription] = useState("");
  const [htmlOutput, setHtmlOutput] = useState("");
  const [designOutput, setDesignOutput] = useState("");
  const [copiedField, setCopiedField] = useState<TemplateExportType | null>(null);
  const [lastExportLabel, setLastExportLabel] = useState<string | null>(null);
  const [exportModal, setExportModal] = useState<TemplateExportType | null>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreenElement(containerRef);
  const isCreatingTemplate = !templateIdParam || templateIdParam === "new";

  const templateQuery = useQuery(
    trpc.marketing.getEmailTemplateById.queryOptions(
      {
        id: templateIdParam ?? "",
      },
      {
        enabled: !isCreatingTemplate,
      },
    ),
  );
  const template: MarketingTemplate | undefined = templateQuery.data;

  const { mutateAsync: saveTemplate, isPending: isSavingTemplate } = useMutation(
    trpc.marketing.saveEmailTemplate.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.marketing.getLatestEmailTemplate.queryKey(),
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.marketing.listEmailTemplates.queryKey(),
        });
      },
    }),
  );

  useEffect(() => {
    hasLoadedInitialTemplateRef.current = false;
  }, [templateIdParam]);

  useEffect(() => {
    if (isCreatingTemplate) {
      hasLoadedInitialTemplateRef.current = false;
      setTemplateId(null);
      setTemplateTitle("Title");
      setTemplateDescription("");
      setHtmlOutput("");
      setDesignOutput("");
      setLastExportLabel(null);
      return;
    }

    if (!template) {
      return;
    }

    setTemplateId(template.id);
    setTemplateTitle(template.title || "Title");
    setTemplateDescription(template.description || "");
    setHtmlOutput(template.html || "");
    setDesignOutput(template.designJson || "");
    setLastExportLabel(
      template.updatedAt
        ? template.updatedAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
    );
  }, [isCreatingTemplate, template]);

  useEffect(() => {
    if (!isReady || !template?.designJson || hasLoadedInitialTemplateRef.current) {
      return;
    }

    try {
      const parsedDesign = JSON.parse(template.designJson) as object;
      editorRef.current?.editor?.loadDesign(parsedDesign);
      hasLoadedInitialTemplateRef.current = true;
    } catch (error) {
      console.error("Failed to load saved marketing template design", error);
      toast.error("Failed to load the saved template design.");
    }
  }, [isReady, template?.designJson]);

  const handleReady: EmailEditorProps["onReady"] = () => {
    setIsReady(true);
  };

  const updateExportTimestamp = () => {
    setLastExportLabel(formatExportTime());
  };

  const persistTemplate = async ({
    designJson,
    html,
  }: {
    designJson: string;
    html?: string;
  }) => {
    const savedTemplate = await saveTemplate({
      id: templateId ?? undefined,
      title: templateTitle,
      description: templateDescription,
      designJson,
      html,
    });

    setTemplateId(savedTemplate.id);
    setTemplateTitle(savedTemplate.title || "Title");
    setTemplateDescription(savedTemplate.description || "");

    if (isCreatingTemplate) {
      router.replace(`${templateEditorBasePath}/${savedTemplate.id}`);
    }
  };

  const exportHtmlFromEditor = () =>
    new Promise<ExportHtmlResult>((resolve, reject) => {
      const editor = editorRef.current?.editor;

      if (!editor) {
        reject(new Error("Email editor is not ready yet."));
        return;
      }

      editor.exportHtml((data: ExportHtmlResult) => {
        resolve(data);
      });
    });

  const saveDesignFromEditor = () =>
    new Promise<SavedDesign>((resolve, reject) => {
      const editor = editorRef.current?.editor;

      if (!editor) {
        reject(new Error("Email editor is not ready yet."));
        return;
      }

      editor.saveDesign((design: SavedDesign) => {
        resolve(design);
      });
    });

  const handleExportHtml = async () => {
    try {
      const data = await exportHtmlFromEditor();
      setHtmlOutput(data.html);
      const nextDesignOutput = JSON.stringify(data.design, null, 2);
      setDesignOutput(nextDesignOutput);
      await persistTemplate({
        designJson: nextDesignOutput,
        html: data.html,
      });
      updateExportTimestamp();
      setExportModal("html");
      toast.success("Template saved and published.");
    } catch (error) {
      console.error("Failed to export marketing template HTML", error);
      toast.error("Failed to publish template.");
    }
  };

  const handleSaveDesign = async () => {
    try {
      const design = await saveDesignFromEditor();
      const nextDesignOutput = JSON.stringify(design, null, 2);
      setDesignOutput(nextDesignOutput);
      await persistTemplate({
        designJson: nextDesignOutput,
        html: htmlOutput || undefined,
      });
      updateExportTimestamp();
      setExportModal("json");
      toast.success("Template saved.");
    } catch (error) {
      console.error("Failed to save marketing template design", error);
      toast.error("Failed to save template.");
    }
  };

  const handleCopy = async (value: string, field: TemplateExportType) => {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopiedField(field);

    globalThis.setTimeout(() => {
      setCopiedField((current) => (current === field ? null : current));
    }, 1500);
  };

  const updateTemplateMeta = (title: string, description: string) => {
    setTemplateTitle(title.trim() || "Title");
    setTemplateDescription(description.trim());
  };

  return {
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
    lastExportLabel,
    setExportModal,
    templateId,
    templateDescription,
    templateTitle,
    toggleFullscreen,
    updateTemplateMeta,
    isSavingTemplate,
  };
}
