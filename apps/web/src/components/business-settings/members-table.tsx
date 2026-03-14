"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Trash } from "lucide-react";
import { useMemo, useState, type JSX } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { getInitials, roleColors } from "../manage-account/utils";
import { formatDate } from "@/lib/utils";
import { Button } from "../ui/button";
import OrganizationInvitationModal from "../invitations/organization-invite-modal";
import { authClient } from "@/lib/auth-client";
import { confirm } from "../ui/confirm";
import { toast } from "sonner";
import type { OrgRole } from "../../../../server/prisma/generated/enums";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { parseAsInteger, useQueryState } from "nuqs";

const statusColors: Record<
  string,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  pending: {
    variant: "secondary",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 hover:!bg-amber-100",
  },
  accepted: {
    variant: "outline",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 hover:!bg-emerald-100",
  },
  declined: {
    variant: "destructive",
    className: "bg-red-100 text-red-700 border-red-200 hover:!bg-red-100",
  },
};

// ----------------------
// 🔹 MAIN COMPONENT
// ----------------------
export function MembersTable() {
  const [isCreateMembersOpen, setIsCreateMemberOpen] = useState(false);

  return (
    <div className="space-y-10">
      {/* --- Members Section --- */}
      <MembersTableSection
        isCreateMembersOpen={isCreateMembersOpen}
        setIsCreateMemberOpen={setIsCreateMemberOpen}
      />

      {/* --- Invitations Section --- */}
      <InvitationsTableSection />
    </div>
  );
}

// ----------------------
// 🔹 MEMBERS TABLE SECTION
// ----------------------
function MembersTableSection({
  isCreateMembersOpen,
  setIsCreateMemberOpen,
}: {
  isCreateMembersOpen: boolean;
  setIsCreateMemberOpen: (v: boolean) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: members,
    isLoading,
    refetch,
  } = useQuery(trpc.organization.getOrganizationUsers.queryOptions());

  const { mutateAsync } = useMutation(
    trpc.organization.removeOrganizationMember.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    })
  );

  const { checkPermission } = usePermissions();
  const { data: activeUser } = authClient.useSession();

  const filteredMembers = members
    ?.filter(
      (member) =>
        member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((member) => member.user.email !== activeUser?.user.email);

  const Skeleton = MakeSkeletonRowsAndCols(5, 10);
  const hasPermToRemove = useMemo(
    () => checkPermission(["DELETE::MEMBERS"]),
    [checkPermission]
  );

  const handleRemove = async (name: string, id: string) => {
    const ok = await confirm({
      title: "Remove Member?",
      description: `This will permanently remove ${name} from your organization.`,
      confirmText: "Remove",
      cancelText: "Cancel",
    });

    if (!ok) return;

    const promise = mutateAsync({ userId: id });
    toast.promise(promise, {
      success: "Member removed",
      loading: "Removing member...",
    });
  };

  return (
    <section>
      <div className="flex w-full justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Organization Members
          </h2>
          <p className="text-muted-foreground">
            Manage your organization&apos;s team members and their roles.
          </p>
        </div>
        <Button onClick={() => setIsCreateMemberOpen(true)}>
          Invite Team Member
        </Button>
        <OrganizationInvitationModal
          open={isCreateMembersOpen}
          onOpenChange={setIsCreateMemberOpen}
        />
      </div>

      <div className="mb-8 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <Skeleton />
            ) : filteredMembers?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers?.map((member) => (
                <TableRow
                  key={member.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-border">
                        <AvatarImage
                          src={member.user.image || "/placeholder.svg"}
                          alt={member.user.name}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getInitials(member.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">
                        {member.user.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.user.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        roleColors[member.role] ||
                        "bg-muted text-muted-foreground"
                      }
                    >
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(member.user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={() =>
                        handleRemove(member.user.name, member.user.id)
                      }
                      disabled={
                        !canSeeRemoveButton(
                          member.role,
                          activeUser?.user.management?.role,
                          hasPermToRemove
                        )
                      }
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                    >
                      <Trash />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        Showing {filteredMembers?.length ?? 0} of {members?.length ?? 0} members
      </div>
    </section>
  );
}

// ----------------------
// 🔹 INVITATIONS TABLE SECTION
// ----------------------
function InvitationsTableSection() {
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: true })
  );

  const limit = 2;

  const { data, isLoading, isError, refetch } = useQuery(
    trpc.invitation.getOrganizationInvitations.queryOptions({ page, limit })
  );

  const invitations = data?.invitations ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const Skeleton = MakeSkeletonRowsAndCols(5, limit);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Pending Invitations
        </h2>
        <p className="text-muted-foreground">
          View and track pending invitations sent to potential team members.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Sent On</TableHead>

              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <Skeleton />
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-destructive"
                >
                  Failed to load invitations.{" "}
                  <Button
                    variant="link"
                    className="text-primary"
                    onClick={() => refetch()}
                  >
                    Retry
                  </Button>
                </TableCell>
              </TableRow>
            ) : invitations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  No pending invitations
                </TableCell>
              </TableRow>
            ) : (
              invitations.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium text-foreground">
                    {inv.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {inv.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        roleColors[inv.role] || "bg-muted text-muted-foreground"
                      }
                    >
                      {inv.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(inv.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        statusColors[inv.status.toLowerCase()]?.variant ??
                        "outline"
                      }
                      className={
                        statusColors[inv.status.toLowerCase()]?.className ??
                        "bg-muted text-muted-foreground"
                      }
                    >
                      {inv.expAt.getTime() < Date.now() &&
                      inv.status === "PENDING"
                        ? "EXPIRED"
                        : inv.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground gap-4">
        <span>
          Showing {invitations.length} of {total} invitations
        </span>

        {/* Pagination Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => handlePageChange(page - 1)}
          >
            Previous
          </Button>

          <span className="text-foreground font-medium">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isLoading}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}

// ----------------------
// 🔹 UTILITIES
// ----------------------
const canSeeRemoveButton = (
  memberRole: OrgRole,
  userRole: OrgRole | undefined,
  hasPermToRemove: boolean
): boolean => {
  if (!hasPermToRemove) return false;
  if (memberRole === "OWNER") return false;
  if (!userRole) return false;
  if (userRole === "ADMIN" && memberRole === "ADMIN") return false;
  return true;
};

const MakeSkeletonRowsAndCols = (cols: number, rows: number) => {
  return function TableSkeleton(): JSX.Element {
    return (
      <>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <TableRow key={rowIdx} className="hover:bg-transparent">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <TableCell key={colIdx}>
                <div
                  className={`animate-pulse rounded bg-muted/30 ${
                    colIdx === 0 ? "h-10 w-40" : "h-4 w-full"
                  }`}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </>
    );
  };
};
