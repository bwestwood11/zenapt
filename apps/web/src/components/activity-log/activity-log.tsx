"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { cn } from "@/lib/utils";
import { ACTIVITY_LOG_ACTIONS } from "./activityLog";

const getActionBadgeVariant = (type: string) => {
  switch (type) {
    case "deployment":
      return "default";
    case "auth":
      return "secondary";
    case "error":
      return "destructive";
    case "security":
      return "outline";
    default:
      return "secondary";
  }
};

type Filters = {
  actions?: string[];
  userId?: string;
};

export function useOrganizationLogs(
  page: number,
  limit = 15,
  filters?: Filters
) {
  return useQuery(
    trpc.logs.getOrganizationLogs.queryOptions(
      { page, limit, filters },
      {
        placeholderData: keepPreviousData,
      }
    )
  );
}

export function ActivityLog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const {
    data: paginatedPage,
    isFetching,
    isPlaceholderData,
  } = useOrganizationLogs(currentPage, itemsPerPage, {
    actions: [selectedAction],
    userId: selectedUser === "all" ? undefined : selectedUser,
  });
  const { data: users } = useQuery(
    trpc.organization.getOrganizationUsers.queryOptions()
  );

  const uniqueActionTypes = useMemo(() => {
    return Object.keys(ACTIVITY_LOG_ACTIONS)
  }, []);

  const totalPages = paginatedPage?.pagination.totalPages;
  const paginatedActivities = paginatedPage?.logs || [];

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedUser, selectedAction]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2 text-foreground">
          Activity Log
        </h1>
        <p className="text-muted-foreground">
          Monitor all activities across your Med Spa Business
        </p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">

        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card border-border text-foreground">
            <SelectValue placeholder="Filter by user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users?.map((user) => (
              <SelectItem key={user.id} value={user.user.id}>
                {user.user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedAction} onValueChange={setSelectedAction}>
          <SelectTrigger className="w-full capitalize sm:w-[200px] bg-card border-border text-foreground">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActionTypes.map((type) => (
              <SelectItem className="capitalize" key={type} value={type}>
                {type.split("_").join(" ").toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          "rounded-lg border border-border bg-card overflow-hidden",
          isFetching && "animate-pulse",
          isPlaceholderData && "animate-pulse"
        )}
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-muted/50">
              <TableHead className="text-muted-foreground font-medium">
                Action
              </TableHead>
              <TableHead className="text-muted-foreground font-medium">
                User
              </TableHead>
              <TableHead className="text-muted-foreground font-medium">
                Date
              </TableHead>
              <TableHead className="text-muted-foreground font-medium">
                Description
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedActivities?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-12 text-muted-foreground"
                >
                  No activities found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              paginatedActivities.map((activity) => (
                <TableRow
                  key={activity.id}
                  className="border-border hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium">
                    <Badge
                      variant={getActionBadgeVariant(activity.action)}
                      className="font-normal capitalize"
                    >
                      {activity.action.split("_").join(" ").toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {/* <AvatarImage src={activity.userAvatar || "/placeholder.svg"} alt={activity.user} /> */}
                        <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                          {activity.user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-foreground font-medium">
                        {activity.user.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {activity.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-md">
                    {activity.description}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {paginatedPage?.pagination.page || 0} of{" "}
          {paginatedPage?.pagination.total || 0} activities
        </div>

        {paginatedPage?.pagination.totalPages &&
          paginatedPage.pagination.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {Array.from(
                  { length: paginatedPage?.pagination.totalPages || 0 },
                  (_, i) => i + 1
                ).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="h-8 w-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(totalPages || prev + 1, prev + 1)
                  )
                }
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
      </div>
    </div>
  );
}
