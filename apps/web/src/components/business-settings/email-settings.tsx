"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type VerificationStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "TEMPORARY_FAILURE";

type DnsRecord = {
  type: string;
  name: string;
  value: string;
};

type EmailSettings = {
  domains: Array<{
    id: string;
    domain: string;
    mailFromDomain: string | null;
    verificationStatus: VerificationStatus;
    verifiedForSendingStatus: boolean;
    dkimStatus: VerificationStatus;
    dkimTokens: string[];
    mailFromStatus: VerificationStatus;
    verificationErrorType: string | null;
    senderEmails: Array<{
      id: string;
      email: string;
      displayName: string | null;
      isDefault: boolean;
      verificationStatus: VerificationStatus;
      verifiedForSendingStatus: boolean;
    }>;
  }>;
  senderEmails: Array<{
    id: string;
    email: string;
    displayName: string | null;
    isDefault: boolean;
    verificationStatus: VerificationStatus;
    verifiedForSendingStatus: boolean;
    domain: {
      id: string;
      domain: string;
      verifiedForSendingStatus: boolean;
    } | null;
  }>;
};

const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-2";

export function OrganizationEmailSettings() {
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  const settingsQuery = useQuery(
    trpc.organization.getOrganizationEmailSettings.queryOptions(),
  );

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.organization.getOrganizationEmailSettings.queryKey(),
    });
  };

  const createDomain = useMutation(
    trpc.organization.createOrganizationEmailDomain.mutationOptions({
      onSuccess: async () => {
        setDomain("");
        await invalidate();
        toast.success("Domain identity created.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const createSender = useMutation(
    trpc.organization.createOrganizationSenderEmail.mutationOptions({
      onSuccess: async () => {
        setSenderEmail("");
        setDisplayName("");
        await invalidate();
        toast.success("Sender email created.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const refreshDomain = useMutation(
    trpc.organization.refreshOrganizationEmailDomain.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Domain status refreshed.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const refreshSender = useMutation(
    trpc.organization.refreshOrganizationSenderEmail.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Sender status refreshed.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteDomain = useMutation(
    trpc.organization.deleteOrganizationEmailDomain.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Domain removed.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteSender = useMutation(
    trpc.organization.deleteOrganizationSenderEmail.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Sender removed.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const setDefaultSender = useMutation(
    trpc.organization.setOrganizationDefaultSenderEmail.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Default sender updated.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const sendTestEmail = useMutation(
    trpc.organization.sendOrganizationTestEmail.mutationOptions({
      onSuccess: () => {
        toast.success("Test email sent to your account email.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const settings = settingsQuery.data as EmailSettings | undefined;
  const defaultSender = useMemo(
    () => settings?.senderEmails.find((sender) => sender.isDefault) ?? null,
    [settings?.senderEmails],
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Email Senders
        </h2>
        <p className="text-muted-foreground">
          Add a verified domain or a standalone verified email. Organization
          email always sends from a verified sender identity owned by the tenant.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default sender</CardTitle>
          <CardDescription>
            This sender is used when an organization-specific email does not
            specify a `from` address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {defaultSender ? (
            <div className="flex items-center gap-3">
              <StatusBadge status={defaultSender.verificationStatus} verified />
              <span className="font-medium">{formatSender(defaultSender)}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No verified default sender configured yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add domain identity</CardTitle>
            <CardDescription>
              Verifies the domain, enables DKIM, and configures a custom MAIL
              FROM subdomain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
              />
            </div>
            <Button
              isLoading={createDomain.isPending}
              onClick={() => createDomain.mutate({ domain })}
            >
              Add domain
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add sender email</CardTitle>
            <CardDescription>
              For `example.com`, first verify the domain, then add sender
              addresses like `hello@example.com`. For external addresses like
              `hello@gmail.com`, SES sends a verification email. To avoid AWS
              verification emails, verify the domain first and use sender
              addresses on that domain instead.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senderEmail">Sender email</Label>
              <Input
                id="senderEmail"
                placeholder="hello@example.com"
                value={senderEmail}
                onChange={(event) => setSenderEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                placeholder="ZenApt Studio"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <Button
              isLoading={createSender.isPending}
              onClick={() =>
                createSender.mutate({
                  email: senderEmail,
                  displayName,
                })
              }
            >
              Add sender
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sender emails</CardTitle>
          <CardDescription>
            Standalone emails verify directly in SES. Domain mailboxes inherit
            the domain verification after the domain is confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings?.senderEmails.length ? (
                settings.senderEmails.map((sender) => (
                  <TableRow key={sender.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{formatSender(sender)}</div>
                        {sender.domain ? (
                          <div className="text-xs text-muted-foreground">
                            Domain: {sender.domain.domain}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={sender.verificationStatus}
                        verified={sender.verifiedForSendingStatus}
                      />
                    </TableCell>
                    <TableCell>
                      {sender.domain ? "Verified domain" : "Direct email"}
                    </TableCell>
                    <TableCell>
                      {sender.isDefault ? (
                        <Badge variant="outline">Default</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          isLoading={refreshSender.isPending}
                          onClick={() => refreshSender.mutate({ id: sender.id })}
                        >
                          Refresh
                        </Button>
                        {sender.verifiedForSendingStatus ? (
                          <Button
                            variant="outline"
                            isLoading={sendTestEmail.isPending}
                            onClick={() => sendTestEmail.mutate({ id: sender.id })}
                          >
                            Send test
                          </Button>
                        ) : null}
                        {!sender.isDefault && sender.verifiedForSendingStatus ? (
                          <Button
                            variant="outline"
                            isLoading={setDefaultSender.isPending}
                            onClick={() =>
                              setDefaultSender.mutate({ id: sender.id })
                            }
                          >
                            Make default
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          isLoading={deleteSender.isPending}
                          onClick={() => deleteSender.mutate({ id: sender.id })}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    No sender emails configured yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact lists</CardTitle>
          <CardDescription>
            Contact lists now live in Marketing so they can stay filter-based and be reused while
            creating campaign snapshots.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl text-sm text-muted-foreground">
            Manage saved audience filters in the Marketing workspace. Campaigns now select a contact
            list, create a snapshot, and persist the campaign audience there.
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard/marketing/contact-lists">Open contact lists</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/marketing/campaigns/new">Create campaign</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verified domains</CardTitle>
          <CardDescription>
            Publish these records in DNS, then use Refresh to sync SES status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings?.domains.length ? (
            settings.domains.map((domainRecord) => {
              const dnsRecords = buildDnsRecords(
                domainRecord.domain,
                domainRecord.dkimTokens,
              );

              return (
                <div key={domainRecord.id} className="space-y-4 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium">{domainRecord.domain}</div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          status={domainRecord.verificationStatus}
                          verified={domainRecord.verifiedForSendingStatus}
                          label="Domain"
                        />
                        <StatusBadge
                          status={domainRecord.dkimStatus}
                          verified={domainRecord.dkimStatus === "SUCCESS"}
                          label="DKIM"
                        />
                        <StatusBadge
                          status={domainRecord.mailFromStatus}
                          verified={domainRecord.mailFromStatus === "SUCCESS"}
                          label="MAIL FROM"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        isLoading={refreshDomain.isPending}
                        onClick={() => refreshDomain.mutate({ id: domainRecord.id })}
                      >
                        Refresh
                      </Button>
                      <Button
                        variant="outline"
                        isLoading={deleteDomain.isPending}
                        onClick={() => deleteDomain.mutate({ id: domainRecord.id })}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {domainRecord.verificationErrorType ? (
                    <div className="space-y-1 text-sm text-destructive">
                      <p>
                        SES verification error: {domainRecord.verificationErrorType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {describeVerificationError(domainRecord.verificationErrorType)}
                      </p>
                    </div>
                  ) : null}

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium">DNS records</div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportDnsRecords(domainRecord.domain, dnsRecords)}
                      >
                        Export
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="w-24 text-right">Copy key</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead className="w-28 text-right">Copy value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dnsRecords.map((record) => (
                          <TableRow key={`${record.type}-${record.name}-${record.value}`}>
                            <TableCell>{record.type}</TableCell>
                            <TableCell className="font-mono text-xs">{record.name}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void copyDnsField("key", domainRecord.domain, record.name)}
                              >
                                Copy key
                              </Button>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{record.value}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void copyDnsField("value", domainRecord.domain, record.value)}
                              >
                                Copy value
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">
              No verified domains configured yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({
  status,
  verified,
  label,
}: Readonly<{
  status: VerificationStatus;
  verified: boolean;
  label?: string;
}>) {
  const prefix = label ? `${label}: ` : "";
  const text = `${prefix}${verified ? "Verified" : humanizeStatus(status)}`;

  return (
    <Badge
      variant="outline"
      className={
        verified
          ? "border-emerald-600/30 bg-emerald-600/15 text-emerald-700"
          : "border-amber-500/30 bg-amber-500/15 text-amber-700"
      }
    >
      {text}
    </Badge>
  );
}

const humanizeStatus = (status: VerificationStatus) => {
  switch (status) {
    case "NOT_STARTED":
      return "Not started";
    case "PENDING":
      return "Pending";
    case "SUCCESS":
      return "Verified";
    case "FAILED":
      return "Failed";
    case "TEMPORARY_FAILURE":
      return "Temporary failure";
    default:
      return status;
  }
};

const describeVerificationError = (errorType: string) => {
  switch (errorType) {
    case "HOST_NOT_FOUND":
      return "SES could not resolve one or more DNS records. Check that the record name and value are exact, the records are public DNS records, and DNS proxying is disabled for the CNAME records.";
    case "INVALID_VALUE":
      return "A DNS record exists, but its value does not match what SES expects. Recopy the key and value exactly as shown below.";
    case "TYPE_NOT_FOUND":
      return "SES could not find the expected DNS record type. Make sure each listed CNAME, MX, and TXT record exists with the correct type.";
    default:
      return "Check that the DNS records below were added exactly as shown and wait for DNS propagation before refreshing again.";
  }
};

const formatSender = (sender: { email: string; displayName: string | null }) => {
  return sender.displayName ? `${sender.displayName} <${sender.email}>` : sender.email;
};

const buildDnsRecords = (domain: string, dkimTokens: string[]): DnsRecord[] => {
  const records = dkimTokens.map((token) => ({
    type: "CNAME",
    name: `${token}._domainkey.${domain}`,
    value: `${token}.dkim.amazonses.com`,
  }));
  const mailFromDomain = `mail.${domain}`;

  records.push(
    {
      type: "MX",
      name: mailFromDomain,
      value: `10 feedback-smtp.${AWS_REGION}.amazonses.com`,
    },
    {
      type: "TXT",
      name: mailFromDomain,
      value: '"v=spf1 include:amazonses.com -all"',
    },
  );

  return records;
};

const copyDnsField = async (
  field: "key" | "value",
  domain: string,
  value: string,
) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`Copied DNS ${field} for ${domain}.`);
  } catch {
    toast.error(`Failed to copy DNS ${field}.`);
  }
};

const exportDnsRecords = (domain: string, records: DnsRecord[]) => {
  const csv = formatDnsRecordsCsv(records);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${domain}-ses-dns-records.csv`;
  link.click();
  URL.revokeObjectURL(url);

  toast.success(`Exported DNS records for ${domain}.`);
};

const formatDnsRecordsCsv = (records: DnsRecord[]) => {
  const rows = records.map((record) => [record.type, record.name, record.value]);

  return [
    ["Type", "Name", "Value"],
    ...rows,
  ]
    .map((columns) => columns.map(csvEscape).join(","))
    .join("\n");
};

const csvEscape = (value: string) => {
  const normalized = value.replaceAll('"', '""');
  return `"${normalized}"`;
};

