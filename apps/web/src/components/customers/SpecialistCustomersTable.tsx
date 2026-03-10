"use client";

import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";
import { Users } from "lucide-react";

interface SpecialistCustomersTableProps {
  locationId: string;
  slug: string;
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

interface TableContentProps {
  isLoading: boolean;
  customers:
    | Array<{
        id: string;
        phoneNumber: string | null;
        lastAppointmentAt: Date | null;
        totalAppointments: number;
        user: { name: string | null; email: string | null } | null;
      }>
    | undefined;
  limit: number;
  slug: string;
}

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface StatsHeaderProps {
  total: number | undefined;
  isLoading: boolean;
}

const LOADING_ROW_KEYS = [
  "loading-1",
  "loading-2",
  "loading-3",
  "loading-4",
  "loading-5",
  "loading-6",
  "loading-7",
  "loading-8",
  "loading-9",
  "loading-10",
] as const;

const formatDate = (date: Date | null) => {
  if (!date) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
};

function StatsHeader({ total, isLoading }: Readonly<StatsHeaderProps>) {
  return (
    <div className="flex items-center gap-6 rounded-lg border bg-muted/50 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-3">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            My Customers
          </p>
          {isLoading ? (
            <Skeleton className="mt-1 h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold">{total ?? 0}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchBar({ value, onChange }: Readonly<SearchBarProps>) {
  return (
    <div className="flex items-center gap-4">
      <Input
        placeholder="Search by name, email, or phone..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 max-w-md"
      />
    </div>
  );
}

function TableContent({
  isLoading,
  customers,
  limit,
  slug,
}: Readonly<TableContentProps>) {
  if (isLoading) {
    return (
      <>
        {LOADING_ROW_KEYS.slice(0, limit).map((rowKey) => (
          <TableRow key={rowKey}>
            <TableCell className="font-medium">
              <Skeleton className="h-4 w-[160px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[220px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[140px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[90px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[120px]" />
            </TableCell>
          </TableRow>
        ))}
      </>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <TableRow>
        <TableCell
          colSpan={5}
          className="h-32 text-center text-muted-foreground"
        >
          No customers found
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {customers.map((customer) => (
        <TableRow key={customer.id} className="hover:bg-muted/50">
          <TableCell className="font-medium">
            <Link
              href={`/dashboard/l/${slug}/customers/${customer.id}`}
              className="text-left transition-colors hover:text-primary hover:underline"
            >
              {customer.user?.name ?? "N/A"}
            </Link>
          </TableCell>
          <TableCell className="text-muted-foreground">
            {customer.user?.email ?? "N/A"}
          </TableCell>
          <TableCell className="text-muted-foreground">
            {customer.phoneNumber ?? "N/A"}
          </TableCell>
          <TableCell className="text-muted-foreground">
            {customer.totalAppointments}
          </TableCell>
          <TableCell className="text-muted-foreground">
            {formatDate(customer.lastAppointmentAt)}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  total,
  onPageChange,
}: Readonly<PaginationControlsProps>) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages} ({total} total)
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function SpecialistCustomersTable({
  locationId,
  slug,
}: Readonly<SpecialistCustomersTableProps>) {
  const limit = 10;

  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    search: parseAsString.withDefault(""),
  });

  const { data, isLoading } = useQuery(
    trpc.customers.getSpecialistCustomers.queryOptions({
      locationId,
      page: params.page,
      limit,
      search: params.search || undefined,
    }),
  );

  const handleSearchChange = (value: string) => {
    setParams({ search: value, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setParams({ page });
  };

  return (
    <div className="space-y-6">
      <StatsHeader total={data?.pagination.total} isLoading={isLoading} />

      <SearchBar value={params.search} onChange={handleSearchChange} />

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Phone Number</TableHead>
              <TableHead className="font-semibold">Appointments</TableHead>
              <TableHead className="font-semibold">Last Served</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableContent
              isLoading={isLoading}
              customers={data?.customers}
              limit={limit}
              slug={slug}
            />
          </TableBody>
        </Table>
      </div>

      {data && (
        <PaginationControls
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}