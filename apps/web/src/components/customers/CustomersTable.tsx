"use client";

import { Input } from "@/components/ui/input";
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
import { useState } from "react";
import { CustomerDetailsSheet } from "./CustomerDetailsSheet";

interface CustomersTableProps {
  locationId: string;
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
        firstName: string;
        email: string | null;
        phoneNumber: string | null;
      }>
    | undefined;
  limit: number;
  onCustomerClick: (customerId: string) => void;
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

function StatsHeader({ total, isLoading }: StatsHeaderProps) {
  return (
    <div className="flex items-center gap-6 p-6 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Total Customers
          </p>
          {isLoading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold">{total ?? 0}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="flex items-center gap-4">
      <Input
        placeholder="Search by name, email, or phone..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-md h-10"
      />
    </div>
  );
}

function TableContent({
  isLoading,
  customers,
  limit,
  onCustomerClick,
}: TableContentProps) {
  if (isLoading) {
    return (
      <>
        {Array.from({ length: limit }).map((_, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">
              <Skeleton className="h-4 w-[180px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[220px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[140px]" />
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
          colSpan={3}
          className="text-center h-32 text-muted-foreground"
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
            <button
              onClick={() => onCustomerClick(customer.id)}
              className="text-left hover:underline hover:text-primary transition-colors cursor-pointer"
            >
              {customer.firstName}
            </button>
          </TableCell>
          <TableCell className="text-muted-foreground">
            {customer.email ?? "N/A"}
          </TableCell>
          <TableCell className="text-muted-foreground">
            {customer.phoneNumber ?? "N/A"}
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
}: PaginationControlsProps) {
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

export function CustomersTable({ locationId }: CustomersTableProps) {
  const limit = 10;
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    search: parseAsString.withDefault(""),
  });

  const { data, isLoading } = useQuery(
    trpc.customers.getAllCustomers.queryOptions({
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

  const handleCustomerClick = (customerId: string) => {
    setSelectedCustomerId(customerId);
  };

  const handleCloseSheet = () => {
    setSelectedCustomerId(null);
  };

  const selectedCustomer = data?.customers.find(
    (c) => c.id === selectedCustomerId,
  );

  return (
    <div className="space-y-6">
      <StatsHeader total={data?.pagination.total} isLoading={isLoading} />

      <SearchBar value={params.search} onChange={handleSearchChange} />

      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Phone Number</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableContent
              isLoading={isLoading}
              customers={data?.customers}
              limit={limit}
              onCustomerClick={handleCustomerClick}
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

      <CustomerDetailsSheet
        customerId={selectedCustomerId}
        locationId={locationId}
        customerName={selectedCustomer?.firstName}
        customerEmail={selectedCustomer?.email ?? undefined}
        customerPhone={selectedCustomer?.phoneNumber ?? undefined}
        isOpen={selectedCustomerId !== null}
        onClose={handleCloseSheet}
      />
    </div>
  );
}
