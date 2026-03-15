import "server-only"
import prisma from "../../prisma";
import { after } from "next/server"

export const ACTIVITY_LOG_ACTIONS = {
    INVITED_EMPLOYEE: "INVITED_EMPLOYEE",
    CREATED_SERVICE_GROUP: "CREATED_SERVICE_GROUP",
  CREATED_SERVICE_TERM: "CREATED_SERVICE_TERM",
  CREATED_ORGANIZATION: "CREATED_ORGANIZATION",
  UPDATED_ORGANIZATION: "UPDATED_ORGANIZATION",
  REMOVED_ORGANIZATION_MEMBER: "REMOVED_ORGANIZATION_MEMBER",
  CREATED_LOCATION: "CREATED_LOCATION",
  UPDATED_LOCATION_OPERATING_HOURS: "UPDATED_LOCATION_OPERATING_HOURS",
  UPDATED_LOCATION_BRANDING: "UPDATED_LOCATION_BRANDING",
  CREATED_SERVICE: "CREATED_SERVICE",
  CREATED_MY_SERVICE: "CREATED_MY_SERVICE",
  UPDATED_MY_SERVICE: "UPDATED_MY_SERVICE",
  CREATED_APPOINTMENT: "CREATED_APPOINTMENT",
  UPDATED_APPOINTMENT_STATUS: "UPDATED_APPOINTMENT_STATUS",
  RESCHEDULED_APPOINTMENT: "RESCHEDULED_APPOINTMENT"
} as const


type AddActivityLogProps = {
  type: keyof typeof ACTIVITY_LOG_ACTIONS;
  description: string;
  userId: string;
  organizationId: string | undefined | null;
  locationId?: string | null;
};

export const addActivityLog = ({type, description, userId, organizationId, locationId}:AddActivityLogProps) => {
 after(async () => {
    try {
    // Validate required fields early
    if (!type || !description || !userId || !organizationId) {
      console.warn("Missing required fields for addActivityLog");
      return;
    }

    await prisma.activityLog.create({
      data: {
        action: type,
        description,
        userId,
        organizationId,
        locationId,
      },
    });
  } catch (error) {
    console.error("Failed to add activity log:", error);
  }
 });
}