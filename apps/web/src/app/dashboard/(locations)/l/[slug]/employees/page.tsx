import Link from "next/link";
import { forbidden } from "next/navigation";
import { format } from "date-fns";
import { Plus } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getLocationAccess } from "@/lib/permissions/permission";
import { serverTRPC } from "@/utils/server-trpc";

const roleLabel: Record<string, string> = {
  ORGANIZATION_MANAGEMENT: "Organization Management",
  LOCATION_ADMIN: "Location Admin",
  LOCATION_FRONT_DESK: "Front Desk",
  LOCATION_SPECIALIST: "Specialist",
};

export default async function EmployeesPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;

  if (!slug) {
    return forbidden();
  }

  const access = await getLocationAccess(slug);
  if (!access) {
    return forbidden();
  }

  const isManagement =
    access.role === "ORGANIZATION_MANAGEMENT" ||
    access.role === "LOCATION_ADMIN";

  if (!isManagement) {
    return forbidden();
  }

  const employees = await serverTRPC.location.getLocationEmployees.fetch({ slug });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employees</h1>
        <Button asChild>
          <Link className={buttonVariants()} href={`/dashboard/l/${slug}/employees/invite`}>
            <Plus className="mr-2 h-4 w-4" />
            Invite Employee
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.user.name}</TableCell>
                  <TableCell>{employee.user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {roleLabel[employee.role] ?? employee.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(employee.createdAt, "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}

              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No employees found for this location.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
