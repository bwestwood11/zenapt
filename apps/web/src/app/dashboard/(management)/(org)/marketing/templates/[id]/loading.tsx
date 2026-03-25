import { Loader } from "@/components/ui/loader";

export default function MarketingTemplateEditorLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-border/60 bg-card px-8 py-10 shadow-sm">
        <Loader />
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-foreground">Opening template</p>
          <p className="text-sm text-muted-foreground">Loading your editor workspace...</p>
        </div>
      </div>
    </div>
  );
}