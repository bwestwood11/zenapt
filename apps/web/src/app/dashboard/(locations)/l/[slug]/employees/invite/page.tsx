"use client";

import type React from "react";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import z from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/utils/trpc";
import { EmployeeRole } from "../../../../../../../../../server/prisma/generated/enums";
import { toast } from "sonner";
import { Mail, Shield, UserCheck, Users } from "lucide-react";

export default function InviteEmployeePage() {
  const { slug } = useParams<{ slug: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<
    Exclude<EmployeeRole, "ORGANIZATION_MANAGEMENT">
  >(EmployeeRole.LOCATION_ADMIN);

  const {
    mutate: inviteEmployee,
    isSuccess,
    isError,
    isPending,
    error,
  } = useMutation(
    trpc.invitation.inviteLocationEmployee.mutationOptions({
      onSuccess: () => {
        toast.success("Invitation sent successfully");
        setName("");
        setEmail("");
        setRole(EmployeeRole.LOCATION_ADMIN);
      },
      onError: (error) => {
        toast.error(
          error.message || "Failed to send invitation. Please try again."
        );
      },
    })
  );

  const { data: location, isLoading: isLoadingLocations } = useQuery(
    trpc.location.getLocation.queryOptions({ slug })
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !email || !role) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!location?.id) {
      toast.error(
        location == null
          ? "Please wait few seconds we are confirming the location details"
          : "Something is not right reload your page"
      );
      return;
    }

    if (!slug) {
      toast.error("Try Reloading the page");
    }
    inviteEmployee({ name, email, role, locationId: location.id });
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invite Employee</h1>
        <Button asChild>
          <Link className={buttonVariants({ variant: "outline" })} href={`/dashboard/l/${slug}/employees`}>Back to Employees</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite New Employee</CardTitle>
          <CardDescription>
            Send an invitation to add a team member to this location.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Employee Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Employee Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="employee@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">
                Employee Role
              </label>
              <Select
                value={role}
                onValueChange={(v) => {
                  const r = z
                    .enum(EmployeeRole)
                    .exclude([EmployeeRole.ORGANIZATION_MANAGEMENT])
                    .safeParse(v as EmployeeRole);
                  if (r.success) {
                    setRole(r.data);
                  } else {
                    toast.error("Invalid value in employee role");
                  }
                }}
                required
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a role for the employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EmployeeRole.LOCATION_ADMIN}>
                    Admin
                  </SelectItem>
                  <SelectItem value={EmployeeRole.LOCATION_FRONT_DESK}>
                    Front Desk
                  </SelectItem>
                  <SelectItem value={EmployeeRole.LOCATION_SPECIALIST}>
                    Specialist
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-sm font-medium text-foreground">
                Role permissions
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>
                    <strong>Admin:</strong> Full location management access
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>
                    <strong>Front Desk:</strong> Customer and appointment
                    operations
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span>
                    <strong>Specialist:</strong> Service delivery focused
                    access
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isPending || isLoadingLocations}
                className="h-11 px-6"
              >
                <Mail className="mr-2 h-4 w-4" />
                {isPending ? "Sending Invitation..." : "Send Invitation"}
              </Button>
            </div>
          </form>

          {isSuccess && (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-700">
                Invitation sent successfully!
              </p>
            </div>
          )}
          {isError && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">
                {error?.message || "Failed to send invitation."}
              </p>
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="mb-3 font-semibold text-foreground">
              What happens next?
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                The employee receives an invitation email with sign-up
                instructions.
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                Access is granted based on the role selected above.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
