import { Badge } from "../ui/badge";
import type { Employee } from "./types";

export function Header({
  employees,
  locationTimeZone,
}: Readonly<{
  employees: Employee[];
  locationTimeZone: string;
}>) {
  return (
    <div
      className="grid sticky top-0 z-70 border-b bg-background "
      style={{
        gridTemplateColumns: `80px repeat(${employees.length}, 1fr)`,
      }}
    >
      <div className="text-[10px] px-2 py-2 text-muted-foreground border-r">
        {locationTimeZone}
      </div>
      {employees.map((emp) => {
        return (
          <div
            key={emp.employee.id}
            className={`px-2 py-4 text-sm relative font-medium border-r ${emp.code === "EMPLOYEE_OFF" ? "opacity-60" : null}`}
          >
            {emp.code === "EMPLOYEE_OFF" ? (
              <Badge className="bg-gray-500 absolute top-2 right-12">
                Absent
              </Badge>
            ) : null}

            <div className="justify-center items-center flex flex-col">
              <img
                src={emp.employee.image ?? "/placeholder-avatar.png"}
                alt={emp.employee.name}
                className="w-8 h-8 rounded-full mb-1"
              />
              {emp.employee.name}
              <div className="text-xs text-muted-foreground">
                {emp.employee.role}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
