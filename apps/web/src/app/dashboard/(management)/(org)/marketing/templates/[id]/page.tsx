import { MarketingTemplateBuilderWithTemplate } from "@/components/marketing/template-builder";
import { requirePermission } from "@/lib/permissions/permission";

export default async function MarketingTemplateEditorPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  await requirePermission(["UPDATE::ORGANIZATION"]);

  const { id } = await params;

  return (
    <div className="min-h-screen bg-background p-2 sm:p-3 lg:p-4">
      <MarketingTemplateBuilderWithTemplate templateId={id} />
    </div>
  );
}