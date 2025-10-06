"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Users, Shield, UserCheck, ArrowLeft } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { EmployeeRole } from "../../../../../../../../../server/prisma/generated/enums";
import { useParams } from "next/navigation";
import z from "zod";
import { useQuery } from "@tanstack/react-query";

export default function InviteEmployeePage() {
  const { slug } = useParams<{ slug: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<
    Exclude<EmployeeRole, "ORGANIZATION_MANAGEMENT">
  >(EmployeeRole.LOCATION_ADMIN);
  const [isLoading, setIsLoading] = useState(false);
  const { mutate: inviteEmployee } = useMutation(
    trpc.invitation.inviteLocationEmployee.mutationOptions()
  );

  const {data: location, isLoading: isLoadingLocations} =  useQuery(trpc.location.getLocation.queryOptions({slug}))

  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !email || !role) {
      toast.error("Please fill in all fields");
      return;
    }

    if(!location || !location.id){
      toast.error(!location ? "Please wait few seconds we are confirming the location details" : "Something is not right reload your page")
      return
    }

    if (!slug) {
      toast.error("Try Reloading the page");
    }
    inviteEmployee({ name, email, role, locationId: location.id });
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "front_desk":
        return <Users className="h-4 w-4" />;
      case "specialist":
        return <UserCheck className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "admin":
        return "Full access to all location management features";
      case "front_desk":
        return "Customer service and appointment management";
      case "specialist":
        return "Service delivery and client interaction";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-balance">
                  Invite New Employee
                </h1>
                <p className="text-lg text-muted-foreground text-pretty">
                  Send an invitation to join your location team
                </p>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="space-y-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Name Field */}
              <div className="space-y-3">
                <label htmlFor="name" className="text-base font-semibold">
                  Employee Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 text-base"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Enter the full name of the employee you're inviting
                </p>
              </div>

              {/* Email Field */}
              <div className="space-y-3">
                <label htmlFor="email" className="text-base font-semibold">
                  Employee Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="employee@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  The employee will receive an invitation email at this address
                </p>
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <label htmlFor="role" className="text-base font-semibold">
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
                  <SelectTrigger className="h-12 text-base">
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
                <p className="text-sm text-muted-foreground">
                  Choose the appropriate role based on the employee's
                  responsibilities
                </p>
              </div>

              {/* Role Preview */}
              {role && (
                <div className="rounded-lg border border-border bg-accent/50 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      {getRoleIcon(role)}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold capitalize">
                        {role.replace("_", " ")} Role
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {getRoleDescription(role)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Role Descriptions */}
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>
                    <strong>Admin:</strong> Full access to all location
                    management features
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-primary" />
                  <span>
                    <strong>Front Desk:</strong> Customer service and
                    appointment management
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span>
                    <strong>Specialist:</strong> Service delivery and client
                    interaction
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6">
                <Button
                  type="submit"
                  disabled={isLoading || isLoadingLocations}
                  className="h-12 px-8 text-base font-semibold"
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Sending Invitation...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Information Section */}
          <div className="rounded-lg border border-border bg-muted/30 p-6">
            <h3 className="font-semibold text-foreground mb-3">
              What happens next?
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                The employee will receive an email invitation with setup
                instructions
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                They'll be able to create their account and access role-specific
                features
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                You can manage their permissions and role from the team
                management page
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
