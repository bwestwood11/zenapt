"use client";

import Link from "next/link";
import { TRPCClientError } from "@trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, ListChecks, Mail, Save, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/utils/trpc";

type TemplateOption = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: string | Date;
};

type ContactListOption = {
  id: string;
  name: string;
  description: string | null;
  filterMode: "ALL" | "ANY";
  recipientCount: number;
};

type SnapshotPreview = {
  contactListId: string;
  contactListName: string;
  recipientCount: number;
  generatedAt: string | Date;
  previewRecipients: Array<{
    customerId: string;
    email: string;
    name: string | null;
  }>;
};

type CampaignStep = 1 | 2 | 3;

const CAMPAIGN_STEPS: Array<{ id: CampaignStep; title: string; description: string }> = [
  {
    id: 1,
    title: "Basic details",
    description: "Choose the campaign basics and target contact list.",
  },
  {
    id: 2,
    title: "Audience snapshot",
    description: "Generate the snapshot and select the customers to keep.",
  },
  {
    id: 3,
    title: "Create campaign",
    description: "Review the final selection and create the campaign.",
  },
];

export function CampaignBuilder() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [contactListId, setContactListId] = useState("");
  const [snapshotPreview, setSnapshotPreview] = useState<SnapshotPreview | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [snapshotPage, setSnapshotPage] = useState(1);
  const [step, setStep] = useState<CampaignStep>(1);

  const builderDataQuery = useQuery(trpc.marketing.getCampaignBuilderData.queryOptions());

  const createSnapshot = useMutation(
    trpc.marketing.createCampaignAudiencePreview.mutationOptions({
      onSuccess: (data) => {
        const snapshot = data as SnapshotPreview;
        setSnapshotPreview(snapshot);
        setSelectedCustomerIds(snapshot.previewRecipients.map((recipient) => recipient.customerId));
        setSnapshotPage(1);
        setStep(2);
        toast.success("Audience snapshot created.");
      },
      onError: (error) => toast.error(getReadableErrorMessage(error)),
    }),
  );

  const createCampaign = useMutation(
    trpc.marketing.createCampaign.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.marketing.listCampaigns.queryKey(),
        });
        toast.success("Campaign saved with audience snapshot.");
        router.push("/dashboard/marketing/campaigns");
      },
      onError: (error) => toast.error(getReadableErrorMessage(error)),
    }),
  );

  const templates = (builderDataQuery.data?.templates ?? []) as TemplateOption[];
  const contactLists = (builderDataQuery.data?.contactLists ?? []) as ContactListOption[];
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId) ?? null,
    [templateId, templates],
  );
  const selectedContactList = useMemo(
    () => contactLists.find((contactList) => contactList.id === contactListId) ?? null,
    [contactListId, contactLists],
  );
  const isSnapshotCurrent = snapshotPreview?.contactListId === contactListId;
  const shouldShowSnapshotHint = isSnapshotCurrent !== true;
  const isLoadingBuilderData = builderDataQuery.isLoading;
  const shouldShowSnapshotLoading = createSnapshot.isPending;
  const shouldShowSnapshotTable = !shouldShowSnapshotLoading && Boolean(snapshotPreview);
  const shouldShowEmptySnapshot = !shouldShowSnapshotLoading && !snapshotPreview;
  const canSaveCampaign = Boolean(
    title && templateId && contactListId && isSnapshotCurrent && selectedCustomerIds.length > 0,
  );
  const selectedRecipientCount = selectedCustomerIds.length;
  const canContinueToSnapshot = Boolean(title.trim() && templateId && contactListId);
  const canContinueToCreate = Boolean(isSnapshotCurrent && selectedCustomerIds.length > 0);
  const selectedTemplateTitle = selectedTemplate?.title ?? "—";
  const selectedContactListName = selectedContactList?.name ?? "—";

  const handleContactListChange = (value: string) => {
    setContactListId(value);
    setSnapshotPreview(null);
    setSelectedCustomerIds([]);
    setSnapshotPage(1);
    if (step > 1) {
      setStep(1);
    }
  };

  const handleToggleCustomer = (customerId: string, checked: boolean) => {
    setSelectedCustomerIds((current) => {
      if (checked) {
        return current.includes(customerId) ? current : [...current, customerId];
      }

      return current.filter((id) => id !== customerId);
    });
  };

  const handleSelectAllCustomers = () => {
    if (!snapshotPreview) {
      return;
    }

    setSelectedCustomerIds(snapshotPreview.previewRecipients.map((recipient) => recipient.customerId));
  };

  const handleDeselectAllCustomers = () => {
    setSelectedCustomerIds([]);
  };

  const handleContinueFromBasics = () => {
    if (!canContinueToSnapshot) {
      toast.error("Complete the basic details before continuing.");
      return;
    }

    createSnapshot.mutate({ contactListId });
  };

  const handleContinueFromSnapshot = () => {
    if (!isSnapshotCurrent) {
      toast.error("Create a fresh audience snapshot before continuing.");
      return;
    }

    if (selectedCustomerIds.length === 0) {
      toast.error("Select at least one customer before continuing.");
      return;
    }

    setStep(3);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-border/60 bg-card px-6 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            New campaign
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Create campaign
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Follow the steps to enter the basics, auto-generate the audience snapshot, and then create the
            campaign.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard/marketing/contact-lists">
              <ListChecks className="h-4 w-4" />
              Contact lists
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard/marketing/templates">
              <Mail className="h-4 w-4" />
              Templates
            </Link>
          </Button>
        </div>
      </div>

      <CampaignStepsHeader currentStep={step} />

      {step === 1 ? (
        <CampaignDetailsCard
          isLoading={isLoadingBuilderData}
          title={title}
          description={description}
          templateId={templateId}
          contactListId={contactListId}
          templates={templates}
          contactLists={contactLists}
          selectedTemplate={selectedTemplate}
          selectedContactList={selectedContactList}
          isSnapshotPending={createSnapshot.isPending}
          isCampaignPending={createCampaign.isPending}
          canSaveCampaign={canSaveCampaign}
          shouldShowSnapshotHint={shouldShowSnapshotHint}
          selectedRecipientCount={selectedRecipientCount}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onTemplateChange={setTemplateId}
          onContactListChange={handleContactListChange}
        >
          <div className="flex justify-end">
            <Button onClick={handleContinueFromBasics} disabled={!canContinueToSnapshot} isLoading={createSnapshot.isPending}>
              Next: Audience snapshot
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CampaignDetailsCard>
      ) : null}

      {step === 2 ? (
        <div className="space-y-6">
          <SnapshotPreviewCard
            snapshotPreview={snapshotPreview}
            selectedCustomerIds={selectedCustomerIds}
            snapshotPage={snapshotPage}
            shouldShowSnapshotLoading={shouldShowSnapshotLoading}
            shouldShowSnapshotTable={shouldShowSnapshotTable}
            shouldShowEmptySnapshot={shouldShowEmptySnapshot}
            onToggleCustomer={handleToggleCustomer}
            onSelectAllCustomers={handleSelectAllCustomers}
            onDeselectAllCustomers={handleDeselectAllCustomers}
            onSnapshotPageChange={setSnapshotPage}
          />

          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" />
              Back: Basic details
            </Button>
            <Button onClick={handleContinueFromSnapshot} disabled={!canContinueToCreate}>
              Next: Create campaign
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <CreateCampaignReviewCard
          title={title}
          description={description}
          templateTitle={selectedTemplateTitle}
          contactListName={selectedContactListName}
          snapshotGeneratedAt={snapshotPreview?.generatedAt ?? null}
          selectedRecipientCount={selectedRecipientCount}
          isCampaignPending={createCampaign.isPending}
          onBack={() => setStep(2)}
          onCreateCampaign={() =>
            createCampaign.mutate({
              title,
              description,
              templateId,
              contactListId,
              selectedCustomerIds,
            })
          }
        />
      ) : null}
    </div>
  );
}

function CampaignStepsHeader({
  currentStep,
}: Readonly<{
  currentStep: CampaignStep;
}>) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {CAMPAIGN_STEPS.map((step) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;
        let statusClass = "border-border text-muted-foreground";

        if (isCompleted) {
          statusClass = "border-emerald-500/40 bg-emerald-500/15 text-emerald-700";
        } else if (isActive) {
          statusClass = "border-primary/40 bg-primary text-primary-foreground";
        }

        return (
          <Card
            key={step.id}
            className={[
              "rounded-[24px] border-border/60 transition-colors",
              isActive ? "border-primary/40 bg-primary/5" : "",
            ].join(" ")}
          >
            <CardContent className="flex items-start gap-4 p-5">
              <div
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold",
                  statusClass,
                ].join(" ")}
              >
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : step.id}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CampaignDetailsCard({
  isLoading,
  title,
  description,
  templateId,
  contactListId,
  templates,
  contactLists,
  selectedTemplate,
  selectedContactList,
  isSnapshotPending,
  isCampaignPending,
  canSaveCampaign,
  shouldShowSnapshotHint,
  selectedRecipientCount,
  onTitleChange,
  onDescriptionChange,
  onTemplateChange,
  onContactListChange,
  children,
}: Readonly<{
  isLoading: boolean;
  title: string;
  description: string;
  templateId: string;
  contactListId: string;
  templates: TemplateOption[];
  contactLists: ContactListOption[];
  selectedTemplate: TemplateOption | null;
  selectedContactList: ContactListOption | null;
  isSnapshotPending: boolean;
  isCampaignPending: boolean;
  canSaveCampaign: boolean;
  shouldShowSnapshotHint: boolean;
  selectedRecipientCount: number;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTemplateChange: (value: string) => void;
  onContactListChange: (value: string) => void;
  children?: React.ReactNode;
}>) {
  return (
    <Card className="rounded-[28px] border-border/60">
      <CardHeader>
        <CardTitle>Campaign details</CardTitle>
        <CardDescription>
          Save the campaign metadata first, then generate and persist the audience snapshot on
          submit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="campaignTitle">Campaign name</Label>
              <Input
                id="campaignTitle"
                placeholder="Spring reactivation"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaignDescription">Description</Label>
              <Textarea
                id="campaignDescription"
                placeholder="Bring back customers who have not booked recently."
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaignTemplate">Template</Label>
              <Select value={templateId} onValueChange={onTemplateChange}>
                <SelectTrigger id="campaignTemplate" className="w-full">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate ? (
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate.description || "No description added for this template."}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaignContactList">Contact list</Label>
              <Select value={contactListId} onValueChange={onContactListChange}>
                <SelectTrigger id="campaignContactList" className="w-full">
                  <SelectValue placeholder="Select a contact list" />
                </SelectTrigger>
                <SelectContent>
                  {contactLists.map((contactList) => (
                    <SelectItem key={contactList.id} value={contactList.id}>
                      {contactList.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedContactList ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">
                    {selectedContactList.filterMode === "ALL" ? "All filters" : "Any filter"}
                  </Badge>
                  <span>
                    Current estimated audience: {selectedContactList.recipientCount} recipient
                    {selectedContactList.recipientCount === 1 ? "" : "s"}
                  </span>
                </div>
              ) : null}
            </div>

            <p className="text-sm text-muted-foreground">
              {selectedRecipientCount} customer{selectedRecipientCount === 1 ? "" : "s"} selected for this snapshot.
            </p>

            {shouldShowSnapshotHint ? (
              <p className="text-sm text-muted-foreground">
                Generate a fresh snapshot for the selected contact list before saving.
              </p>
            ) : null}

            {children}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SnapshotPreviewCard({
  snapshotPreview,
  selectedCustomerIds,
  snapshotPage,
  shouldShowSnapshotLoading,
  shouldShowSnapshotTable,
  shouldShowEmptySnapshot,
  onToggleCustomer,
  onSelectAllCustomers,
  onDeselectAllCustomers,
  onSnapshotPageChange,
}: Readonly<{
  snapshotPreview: SnapshotPreview | null;
  selectedCustomerIds: string[];
  snapshotPage: number;
  shouldShowSnapshotLoading: boolean;
  shouldShowSnapshotTable: boolean;
  shouldShowEmptySnapshot: boolean;
  onToggleCustomer: (customerId: string, checked: boolean) => void;
  onSelectAllCustomers: () => void;
  onDeselectAllCustomers: () => void;
  onSnapshotPageChange: (page: number) => void;
}>) {
  return (
    <Card className="rounded-[28px] border-border/60">
      <CardHeader>
        <CardTitle>Snapshot preview</CardTitle>
        <CardDescription>
          Review the auto-generated lead snapshot before it gets written to the campaign audience.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {shouldShowSnapshotLoading ? <SnapshotPreviewSkeleton /> : null}
        {shouldShowSnapshotTable && snapshotPreview ? (
          <SnapshotPreviewTable
            snapshotPreview={snapshotPreview}
            selectedCustomerIds={selectedCustomerIds}
            snapshotPage={snapshotPage}
            onToggleCustomer={onToggleCustomer}
            onSelectAllCustomers={onSelectAllCustomers}
            onDeselectAllCustomers={onDeselectAllCustomers}
            onSnapshotPageChange={onSnapshotPageChange}
          />
        ) : null}
        {shouldShowEmptySnapshot ? <EmptySnapshotState /> : null}
      </CardContent>
    </Card>
  );
}

function SnapshotPreviewSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

function SnapshotPreviewTable({
  snapshotPreview,
  selectedCustomerIds,
  snapshotPage,
  onToggleCustomer,
  onSelectAllCustomers,
  onDeselectAllCustomers,
  onSnapshotPageChange,
}: Readonly<{
  snapshotPreview: SnapshotPreview;
  selectedCustomerIds: string[];
  snapshotPage: number;
  onToggleCustomer: (customerId: string, checked: boolean) => void;
  onSelectAllCustomers: () => void;
  onDeselectAllCustomers: () => void;
  onSnapshotPageChange: (page: number) => void;
}>) {
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(snapshotPreview.previewRecipients.length / pageSize));
  const currentPage = Math.min(snapshotPage, totalPages);
  const pageStartIndex = (currentPage - 1) * pageSize;
  const pageRecipients = snapshotPreview.previewRecipients.slice(
    pageStartIndex,
    pageStartIndex + pageSize,
  );
  const allSelected =
    pageRecipients.length > 0 &&
    pageRecipients.every((recipient) =>
      selectedCustomerIds.includes(recipient.customerId),
    );
  const pageSelectedCount = pageRecipients.filter((recipient) =>
    selectedCustomerIds.includes(recipient.customerId),
  ).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">{snapshotPreview.contactListName}</Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {snapshotPreview.recipientCount} recipient
          {snapshotPreview.recipientCount === 1 ? "" : "s"}
        </div>
        <div className="text-sm text-muted-foreground">
          Generated {formatDate(snapshotPreview.generatedAt)}
        </div>
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onSelectAllCustomers}>
            Select all rows
          </Button>
          <Button variant="outline" size="sm" onClick={onDeselectAllCustomers}>
            Deselect all rows
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => {
                    if (checked === true) {
                      onSelectAllCustomers();
                      return;
                    }

                    onDeselectAllCustomers();
                  }}
                  aria-label="Select all customers"
                />
              </div>
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Customer id</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRecipients.length ? (
            pageRecipients.map((recipient) => (
              <TableRow key={recipient.customerId}>
                <TableCell>
                  <Checkbox
                    checked={selectedCustomerIds.includes(recipient.customerId)}
                    onCheckedChange={(checked) =>
                      onToggleCustomer(recipient.customerId, checked === true)
                    }
                    aria-label={`Select ${recipient.name || recipient.email}`}
                  />
                </TableCell>
                <TableCell>{recipient.name || "—"}</TableCell>
                <TableCell>{recipient.email}</TableCell>
                <TableCell className="font-mono text-xs">{recipient.customerId}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-sm text-muted-foreground">
                No recipients found for this snapshot.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {pageStartIndex + 1}-{Math.min(pageStartIndex + pageRecipients.length, snapshotPreview.previewRecipients.length)} of {snapshotPreview.previewRecipients.length}. Selected on this page: {pageSelectedCount}.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onSnapshotPageChange(currentPage - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onSnapshotPageChange(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}

function EmptySnapshotState() {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
      Complete the basic details and continue to this step to auto-generate the audience snapshot for this campaign.
    </div>
  );
}

function CreateCampaignReviewCard({
  title,
  description,
  templateTitle,
  contactListName,
  snapshotGeneratedAt,
  selectedRecipientCount,
  isCampaignPending,
  onBack,
  onCreateCampaign,
}: Readonly<{
  title: string;
  description: string;
  templateTitle: string;
  contactListName: string;
  snapshotGeneratedAt: string | Date | null;
  selectedRecipientCount: number;
  isCampaignPending: boolean;
  onBack: () => void;
  onCreateCampaign: () => void;
}>) {
  return (
    <Card className="rounded-[28px] border-border/60">
      <CardHeader>
        <CardTitle>Create campaign</CardTitle>
        <CardDescription>
          Review the final campaign data below, then create the campaign with the selected audience snapshot.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <ReviewField label="Campaign name" value={title} />
          <ReviewField label="Template" value={templateTitle} />
          <ReviewField label="Contact list" value={contactListName} />
          <ReviewField
            label="Selected recipients"
            value={`${selectedRecipientCount} customer${selectedRecipientCount === 1 ? "" : "s"}`}
          />
          <ReviewField
            label="Snapshot generated"
            value={snapshotGeneratedAt ? formatDate(snapshotGeneratedAt) : "—"}
          />
          <ReviewField label="Description" value={description || "No description added yet."} />
        </div>

        <div className="flex flex-wrap justify-between gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back: Audience snapshot
          </Button>
          <Button onClick={onCreateCampaign} isLoading={isCampaignPending}>
            <Save className="h-4 w-4" />
            Create campaign
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewField({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="space-y-2 rounded-2xl border border-border/60 p-4">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

const formatDate = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

const getReadableErrorMessage = (error: unknown) => {
  if (error instanceof TRPCClientError) {
    const zodIssues = error.data?.zodError?.fieldErrors;

    if (zodIssues) {
      const firstIssue = Object.values(zodIssues)
        .flat()
        .find((message): message is string => Boolean(message));

      if (firstIssue) {
        return firstIssue;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Something went wrong.";
};