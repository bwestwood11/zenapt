"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, ListChecks, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { trpc } from "@/utils/trpc";

type AppointmentStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELED"
  | "NO_SHOW"
  | "RESCHEDULED";

type ContactListFilter =
  | {
      type: "SERVICE_USED";
      serviceId: string;
    }
  | {
      type: "NO_SERVICES_USED";
    }
  | {
      type: "NO_APPOINTMENT_IN_DAYS";
      days: number;
    }
  | {
      type: "APPOINTMENT_STATUS";
      status: AppointmentStatus;
    };

type ContactListFilterDraft = {
  id: string;
  type: ContactListFilter["type"];
  serviceId: string;
  days: string;
  status: AppointmentStatus;
};

type ServiceOption = {
  id: string;
  name: string;
};

type ContactListRecord = {
  id: string;
  name: string;
  description: string | null;
  filterMode: "ALL" | "ANY";
  filters: ContactListFilter[];
  recipientCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

const APPOINTMENT_STATUS_OPTIONS: AppointmentStatus[] = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELED",
  "NO_SHOW",
  "RESCHEDULED",
];

export function MarketingContactListsOverview() {
  const queryClient = useQueryClient();
  const [contactListName, setContactListName] = useState("");
  const [contactListDescription, setContactListDescription] = useState("");
  const [contactListFilterMode, setContactListFilterMode] = useState<"ALL" | "ANY">("ALL");
  const [contactListFilters, setContactListFilters] = useState<ContactListFilterDraft[]>([
    createEmptyFilter(),
  ]);

  const contactListsQuery = useQuery(trpc.marketing.listContactLists.queryOptions());
  const filterOptionsQuery = useQuery(
    trpc.marketing.getContactListFilterOptions.queryOptions(),
  );

  const createContactList = useMutation(
    trpc.marketing.createContactList.mutationOptions({
      onSuccess: async () => {
        setContactListName("");
        setContactListDescription("");
        setContactListFilterMode("ALL");
        setContactListFilters([createEmptyFilter()]);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.marketing.listContactLists.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.marketing.getCampaignBuilderData.queryKey(),
          }),
        ]);
        toast.success("Contact list created.");
      },
      onError: (error) => toast.error(getReadableErrorMessage(error)),
    }),
  );

  const deleteContactList = useMutation(
    trpc.marketing.deleteContactList.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.marketing.listContactLists.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.marketing.getCampaignBuilderData.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.marketing.listCampaigns.queryKey(),
          }),
        ]);
        toast.success("Contact list deleted.");
      },
      onError: (error) => toast.error(getReadableErrorMessage(error)),
    }),
  );

  const serviceOptions = filterOptionsQuery.data?.serviceOptions ?? [];
  const contactLists = (contactListsQuery.data ?? []) as ContactListRecord[];
  const hasLoadedContactLists = !contactListsQuery.isLoading;

  const updateContactListFilter = (
    filterId: string,
    updates: Partial<ContactListFilterDraft>,
  ) => {
    setContactListFilters((current) =>
      current.map((filter) => (filter.id === filterId ? { ...filter, ...updates } : filter)),
    );
  };

  const addContactListFilter = () => {
    setContactListFilters((current) => [...current, createEmptyFilter()]);
  };

  const removeContactListFilter = (filterId: string) => {
    setContactListFilters((current) =>
      current.length === 1 ? current : current.filter((filter) => filter.id !== filterId),
    );
  };

  const handleCreateContactList = () => {
    const normalizedName = contactListName.trim();
    const filters = toContactListPayload(contactListFilters);

    if (normalizedName.length < 2) {
      toast.error("Contact list name must be at least 2 characters.");
      return;
    }

    if (filters.length === 0) {
      toast.error("Add at least one valid filter before saving the contact list.");
      return;
    }

    createContactList.mutate({
      name: normalizedName,
      description: contactListDescription,
      filterMode: contactListFilterMode,
      filters,
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-border/60 bg-card px-6 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Marketing contact lists
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Saved audience filters
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Create reusable filter definitions here, then select one while building a campaign and
            generate a snapshot of leads before submit.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard/marketing/campaigns">
              <ListChecks className="h-4 w-4" />
              View campaigns
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/dashboard/marketing/campaigns/new">
              <Plus className="h-4 w-4" />
              Create campaign
            </Link>
          </Button>
        </div>
      </div>

      <Card className="rounded-[28px] border-border/60">
        <CardHeader>
          <CardTitle>Create contact list</CardTitle>
          <CardDescription>
            Save only the filter rules here. Campaigns will use the latest rules to create a fresh
            audience snapshot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactListName">List name</Label>
              <Input
                id="contactListName"
                placeholder="VIP customers"
                value={contactListName}
                onChange={(event) => setContactListName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactListDescription">Description</Label>
              <Input
                id="contactListDescription"
                placeholder="Customers eligible for seasonal campaigns"
                value={contactListDescription}
                onChange={(event) => setContactListDescription(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Audience filters</div>
                <p className="text-sm text-muted-foreground">
                  Choose whether customers must match every filter or just one.
                </p>
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={contactListFilterMode}
                  onValueChange={(value: "ALL" | "ANY") => setContactListFilterMode(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Match mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Match all filters</SelectItem>
                    <SelectItem value="ANY">Match any filter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              {contactListFilters.map((filter, index) => (
                <div
                  key={filter.id}
                  className="grid gap-3 rounded-xl border border-border/60 p-3 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]"
                >
                  <div className="space-y-2">
                    <Label htmlFor={`filter-type-${filter.id}`}>Filter {index + 1}</Label>
                    <Select
                      value={filter.type}
                      onValueChange={(value: ContactListFilterDraft["type"]) =>
                        updateContactListFilter(filter.id, {
                          ...createFilterDefaults(value),
                          type: value,
                        })
                      }
                    >
                      <SelectTrigger id={`filter-type-${filter.id}`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SERVICE_USED">Used specific service</SelectItem>
                        <SelectItem value="NO_SERVICES_USED">No services at all</SelectItem>
                        <SelectItem value="NO_APPOINTMENT_IN_DAYS">
                          No appointment in last days
                        </SelectItem>
                        <SelectItem value="APPOINTMENT_STATUS">Has appointment status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    {filter.type === "SERVICE_USED" ? (
                      <>
                        <Label htmlFor={`filter-service-${filter.id}`}>Service</Label>
                        <Select
                          value={filter.serviceId}
                          onValueChange={(value) =>
                            updateContactListFilter(filter.id, { serviceId: value })
                          }
                        >
                          <SelectTrigger id={`filter-service-${filter.id}`} className="w-full">
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceOptions.map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    ) : null}

                    {filter.type === "NO_APPOINTMENT_IN_DAYS" ? (
                      <>
                        <Label htmlFor={`filter-days-${filter.id}`}>Days since last appointment</Label>
                        <Input
                          id={`filter-days-${filter.id}`}
                          type="number"
                          min={1}
                          max={3650}
                          value={filter.days}
                          onChange={(event) =>
                            updateContactListFilter(filter.id, { days: event.target.value })
                          }
                        />
                      </>
                    ) : null}

                    {filter.type === "APPOINTMENT_STATUS" ? (
                      <>
                        <Label htmlFor={`filter-status-${filter.id}`}>Appointment status</Label>
                        <Select
                          value={filter.status}
                          onValueChange={(value: AppointmentStatus) =>
                            updateContactListFilter(filter.id, { status: value })
                          }
                        >
                          <SelectTrigger id={`filter-status-${filter.id}`} className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {APPOINTMENT_STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {humanizeAppointmentStatus(status)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    ) : null}
                  </div>

                  <div className="flex items-end justify-end">
                    <Button
                      variant="outline"
                      onClick={() => removeContactListFilter(filter.id)}
                      disabled={contactListFilters.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-between gap-3">
              <Button variant="outline" onClick={addContactListFilter}>
                <Plus className="h-4 w-4" />
                Add filter
              </Button>
              <Button
                isLoading={createContactList.isPending}
                onClick={handleCreateContactList}
              >
                <Filter className="h-4 w-4" />
                Save contact list
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/60">
        <CardHeader>
          <CardTitle>Saved contact lists</CardTitle>
          <CardDescription>
            These lists are reusable filter definitions. Campaign snapshots are created later during
            campaign setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contactListsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : null}

          {hasLoadedContactLists ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Filters</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contactLists.length ? (
                  contactLists.map((contactList) => (
                    <TableRow key={contactList.id}>
                      <TableCell className="font-medium">{contactList.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contactList.description || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">
                            {contactList.filterMode === "ALL" ? "All filters" : "Any filter"}
                          </Badge>
                          {contactList.filters.map((filter, index) => (
                            <Badge key={`${contactList.id}-${index}`} variant="outline">
                              {formatContactListFilter(filter, serviceOptions)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contactList.recipientCount} customer
                        {contactList.recipientCount === 1 ? "" : "s"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(contactList.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          isLoading={deleteContactList.isPending}
                          onClick={() => deleteContactList.mutate({ id: contactList.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      No contact lists created yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
        <CardFooter className="justify-between gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground">
          <span>Use these filters in campaigns to generate fresh lead snapshots.</span>
          <Button asChild variant="outline">
            <Link href="/dashboard/marketing/campaigns/new">Create campaign</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

const createEmptyFilter = (): ContactListFilterDraft => ({
  id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  ...createFilterDefaults("SERVICE_USED"),
});

const createFilterDefaults = (
  type: ContactListFilterDraft["type"],
): Omit<ContactListFilterDraft, "id"> => {
  return {
    type,
    serviceId: "",
    days: "30",
    status: "COMPLETED",
  };
};

const toContactListPayload = (filters: ContactListFilterDraft[]): ContactListFilter[] => {
  const payload: ContactListFilter[] = [];

  for (const filter of filters) {
    switch (filter.type) {
      case "SERVICE_USED":
        if (filter.serviceId) {
          payload.push({ type: "SERVICE_USED", serviceId: filter.serviceId });
        }
        break;
      case "NO_SERVICES_USED":
        payload.push({ type: "NO_SERVICES_USED" });
        break;
      case "NO_APPOINTMENT_IN_DAYS": {
        const days = Number(filter.days);
        if (Number.isFinite(days) && days > 0) {
          payload.push({ type: "NO_APPOINTMENT_IN_DAYS", days: Math.floor(days) });
        }
        break;
      }
      case "APPOINTMENT_STATUS":
        payload.push({ type: "APPOINTMENT_STATUS", status: filter.status });
        break;
    }
  }

  return payload;
};

const humanizeAppointmentStatus = (status: AppointmentStatus) => {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatContactListFilter = (filter: ContactListFilter, serviceOptions: ServiceOption[]) => {
  switch (filter.type) {
    case "SERVICE_USED": {
      const serviceName = serviceOptions.find((service) => service.id === filter.serviceId)?.name;
      return `Used ${serviceName ?? "selected service"}`;
    }
    case "NO_SERVICES_USED":
      return "No services used";
    case "NO_APPOINTMENT_IN_DAYS":
      return `No appointment in ${filter.days} days`;
    case "APPOINTMENT_STATUS":
      return `Status is ${humanizeAppointmentStatus(filter.status)}`;
  }
};

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
    if (error.message.includes('"name"') && error.message.includes("too_small")) {
      return "Contact list name must be at least 2 characters.";
    }

    return error.message;
  }

  return "Something went wrong.";
};