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

export function MembersTable() {
  const [isCreateMembersOpen, setIsCreateMemberOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: members, isLoading,refetch } = useQuery(
    trpc.organization.getOrganizationUsers.queryOptions()
  );

  const { mutateAsync } = useMutation(
    trpc.organization.removeOrganizationMember.mutationOptions({
      onSuccess: () => {
        refetch()
      }
    })
  );

  const {checkPermission} = usePermissions()
  
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

  const hasPermToRemove = useMemo(() => {
    return checkPermission(["DELETE::MEMBERS"])
  }, [checkPermission])

  const handleRemove = async (name: string, id: string) => {
    const ok = await confirm({
      title: "Delete project?",
      description: "This will permanently delete the project and all its data.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!ok) return;
    const promise = mutateAsync({ userId: id });
    toast.promise(promise, {
      success: "Deleted User",
      loading: "Removing the user",
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex w-full justify-between items-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Management Members
          </h2>
          <p className="text-muted-foreground">
            Manage your organization&apos;s team members and their roles.
          </p>
        </div>
      </div>
      <div>
        <div className="mb-12 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background max-w-sm"
            />
          </div>
          <Button onClick={() => setIsCreateMemberOpen(true)}>
            Invite Team Member
          </Button>
          <OrganizationInvitationModal
            open={isCreateMembersOpen}
            onOpenChange={setIsCreateMemberOpen}
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-foreground">
                  Member
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Email
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Role
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Joined
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <Skeleton />
              ) : filteredMembers?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
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
                    <TableCell className="text-muted-foreground">
                      <Button
                        onClick={() =>
                          handleRemove(member.user.name, member.user.id)
                        }
                        disabled={!canSeeRemoveButton(member.role, activeUser?.user.management?.role, hasPermToRemove)}
                        size={"icon"}
                        className="text-destructive"
                        variant={"ghost"}
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
          Showing {filteredMembers?.length} of {members?.length} members
        </div>
      </div>
    </div>
  );
}


const canSeeRemoveButton = (memberRole:OrgRole, userRole:OrgRole | undefined, hasPermToRemove:boolean): boolean => {
  if(!hasPermToRemove) return false
  if(memberRole === "OWNER"){
    return false
  }

  if(!userRole) return false

  if(userRole === "ADMIN" && memberRole === "ADMIN"){
    return false
  }
  
  return true
}

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
