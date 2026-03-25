"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Clock3, FileText, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

export function MarketingTemplatesOverview() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const templatesQuery = useQuery(
    trpc.marketing.listEmailTemplates.queryOptions(),
  );
  const createTemplateMutation = useMutation(
    trpc.marketing.createEmailTemplate.mutationOptions({
      onSuccess: async (template) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.marketing.listEmailTemplates.queryKey(),
        });
        router.push(`/dashboard/marketing/templates/${template.id}`);
      },
    }),
  );

  const templates = templatesQuery.data ?? [];
  const loadingSkeletonIds = [
    "template-skeleton-1",
    "template-skeleton-2",
    "template-skeleton-3",
    "template-skeleton-4",
    "template-skeleton-5",
    "template-skeleton-6",
  ];
  const handleCreateTemplate = () => {
    createTemplateMutation.mutate();
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-border/60 bg-card px-6 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Marketing templates
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            All templates
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Browse saved templates and open any template by id for editing and publishing.
          </p>
        </div>

        {templatesQuery.isLoading ? (
          <Button size="lg" isLoading disabled>
            Loading templates
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleCreateTemplate}
            isLoading={createTemplateMutation.isPending}
            disabled={createTemplateMutation.isPending}
          >
            <Plus className="h-4 w-4" />
            Create template
          </Button>
        )}
      </div>

      {templatesQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loadingSkeletonIds.map((skeletonId) => (
            <Card key={skeletonId} className="rounded-[24px]">
              <CardHeader className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-28" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-28" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : null}

      {!templatesQuery.isLoading && templates.length === 0 ? (
        <Card className="rounded-[28px] border-dashed">
          <CardHeader>
            <CardTitle>No templates yet</CardTitle>
            <CardDescription>
              Create your first marketing template to start publishing reusable campaigns.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={handleCreateTemplate}
              isLoading={createTemplateMutation.isPending}
              disabled={createTemplateMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              Create template
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {!templatesQuery.isLoading && templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="rounded-[24px] border-border/60 transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <CardTitle className="line-clamp-1 text-lg">{template.title}</CardTitle>
                    <CardDescription className="line-clamp-2 min-h-10">
                      {template.description || "No description added yet."}
                    </CardDescription>
                  </div>
                  <div className="rounded-full border border-border/60 p-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                  Updated {formatDistanceToNow(template.updatedAt, { addSuffix: true })}
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-3">
                <p className="truncate text-xs text-muted-foreground">
                  ID: {template.id}
                </p>
                <Link
                  href={`/dashboard/marketing/templates/${template.id}`}
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  Edit
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}