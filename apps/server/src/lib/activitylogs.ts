import "server-only"
import prisma from "../../prisma";
import { after } from "next/server"

export const ACTIVITY_LOG_ACTIONS = {
    INVITED_EMPLOYEE: "INVITED_EMPLOYEE",
    CREATED_SERVICE_GROUP: "CREATED_SERVICE_GROUP",
    CREATED_SERVICE_TERM: "CREATED_SERVICE_TERM"
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