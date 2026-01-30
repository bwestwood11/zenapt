import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "../../../../server/src/routers"
import type { AppointmentStatus } from "../../../../server/prisma/generated/enums"

export type Break = {
  start: number // minutes since midnight
  end: number
  title: string
  type: "food" | "other" | "busy"
}


export type LocationHours = {
  start: number // minutes since midnight
  end: number
}

export type Employee = Extract<inferRouterOutputs<AppRouter>["appointment"]["fetchEmployeesSchedule"], {code: "SUCCESS"}>["schedule"][number]
export type WorkingEmployee = Extract<Employee, {code: "WORKING"}>
export type Appointment = {
  id: string
  employeeId: string
  start: number // minutes since midnight
  end: number
  title: string
  status: AppointmentStatus
  customerName: string
  price: number
}


export type DragData = {
  start: number,
  end: number,
  empId: string,
  id: string,
  title: string
  color: string
}

export type DropData = {
  start: number,
  empId:string
}