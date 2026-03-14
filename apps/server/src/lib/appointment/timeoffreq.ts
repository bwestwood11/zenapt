// import { parseISO, isValid, startOfDay, endOfDay, isAfter } from "date-fns";
// import prisma from "../../../prisma";
// import { ScheduleTargetType, TimeOffStatus } from "@prisma/client";

// export class TimeOffRequestService {
//   // -------------------------------------------------------------
//   // CREATE TIME OFF REQUEST
//   // -------------------------------------------------------------
//   static async createRequest(data: {
//     targetType: ScheduleTargetType;
//     targetId: string;
//     startDate: string | Date;
//     endDate: string | Date;
//     reason?: string;
//     requestedBy?: string;
//   }) {
//     const startDate = typeof data.startDate === 'string' 
//       ? parseISO(data.startDate) 
//       : data.startDate;
    
//     const endDate = typeof data.endDate === 'string'
//       ? parseISO(data.endDate)
//       : data.endDate;

//     if (!isValid(startDate) || !isValid(endDate)) {
//       throw new Error("Invalid date format");
//     }

//     if (isAfter(startDate, endDate)) {
//       throw new Error("Start date must be before or equal to end date");
//     }

//     // Check for overlapping approved time off
//     const hasOverlap = await TimeOffService.hasOverlappingTimeOff(
//       data.targetType,
//       data.targetId,
//       startDate,
//       endDate
//     );

//     if (hasOverlap) {
//       throw new Error("Time off request overlaps with existing approved time off");
//     }

//     return prisma.timeOffRequest.create({
//       data: {
//         targetType: data.targetType,
//         targetId: data.targetId,
//         startDate: startOfDay(startDate),
//         endDate: endOfDay(endDate),
//         reason: data.reason,
//         requestedBy: data.requestedBy,
//         status: TimeOffStatus.PENDING,
//       },
//     });
//   }

//   // -------------------------------------------------------------
//   // GET REQUESTS WITH FILTERS
//   // -------------------------------------------------------------
//   static async getRequests(filters?: {
//     targetType?: ScheduleTargetType;
//     targetId?: string;
//     status?: TimeOffStatus;
//     startDate?: Date;
//     endDate?: Date;
//   }) {
//     const where: any = {};

//     if (filters?.targetType) {
//       where.targetType = filters.targetType;
//     }

//     if (filters?.targetId) {
//       where.targetId = filters.targetId;
//     }

//     if (filters?.status) {
//       where.status = filters.status;
//     }

//     if (filters?.startDate || filters?.endDate) {
//       where.AND = [];

//       if (filters.startDate) {
//         where.AND.push({
//           endDate: { gte: filters.startDate },
//         });
//       }

//       if (filters.endDate) {
//         where.AND.push({
//           startDate: { lte: filters.endDate },
//         });
//       }
//     }

//     return prisma.timeOffRequest.findMany({
//       where,
//       orderBy: {
//         createdAt: 'desc',
//       },
//     });
//   }

//   // -------------------------------------------------------------
//   // GET PENDING REQUESTS
//   // -------------------------------------------------------------
//   static async getPendingRequests(
//     targetType?: ScheduleTargetType,
//     targetId?: string
//   ) {
//     return this.getRequests({
//       targetType,
//       targetId,
//       status: TimeOffStatus.PENDING,
//     });
//   }

//   // -------------------------------------------------------------
//   // GET REQUEST BY ID
//   // -------------------------------------------------------------
//   static async getRequestById(requestId: string) {
//     return prisma.timeOffRequest.findUnique({
//       where: { id: requestId },
//     });
//   }

//   // -------------------------------------------------------------
//   // APPROVE REQUEST (creates TimeOff record)
//   // -------------------------------------------------------------
//   static async approveRequest(
//     requestId: string,
//     reviewedBy: string,
//     reviewNotes?: string
//   ) {
//     const request = await prisma.timeOffRequest.findUnique({
//       where: { id: requestId },
//     });

//     if (!request) {
//       throw new Error("Time off request not found");
//     }

//     if (request.status !== TimeOffStatus.PENDING) {
//       throw new Error(`Cannot approve request with status: ${request.status}`);
//     }

//     // Check for overlaps again before approving
//     const hasOverlap = await TimeOffService.hasOverlappingTimeOff(
//       request.targetType,
//       request.targetId,
//       request.startDate,
//       request.endDate
//     );

//     if (hasOverlap) {
//       throw new Error("Cannot approve: overlaps with existing time off");
//     }

//     // Use transaction to update request and create time off
//     return prisma.$transaction(async (tx) => {
//       // Update request status
//       const updatedRequest = await tx.timeOffRequest.update({
//         where: { id: requestId },
//         data: {
//           status: TimeOffStatus.APPROVED,
//           reviewedBy,
//           reviewedAt: new Date(),
//           reviewNotes,
//         },
//       });

//       // Create approved time off record
//       const timeOff = await tx.timeOff.create({
//         data: {
//           requestId: request.id,
//           targetType: request.targetType,
//           targetId: request.targetId,
//           startDate: request.startDate,
//           endDate: request.endDate,
//           reason: request.reason,
//         },
//       });

//       return { request: updatedRequest, timeOff };
//     });
//   }

//   // -------------------------------------------------------------
//   // DENY REQUEST
//   // -------------------------------------------------------------
//   static async denyRequest(
//     requestId: string,
//     reviewedBy: string,
//     reviewNotes?: string
//   ) {
//     const request = await prisma.timeOffRequest.findUnique({
//       where: { id: requestId },
//     });

//     if (!request) {
//       throw new Error("Time off request not found");
//     }

//     if (request.status !== TimeOffStatus.PENDING) {
//       throw new Error(`Cannot deny request with status: ${request.status}`);
//     }

//     return prisma.timeOffRequest.update({
//       where: { id: requestId },
//       data: {
//         status: TimeOffStatus.DENIED,
//         reviewedBy,
//         reviewedAt: new Date(),
//         reviewNotes,
//       },
//     });
//   }

//   // -------------------------------------------------------------
//   // CANCEL REQUEST (by requester)
//   // -------------------------------------------------------------
//   static async cancelRequest(requestId: string) {
//     const request = await prisma.timeOffRequest.findUnique({
//       where: { id: requestId },
//     });

//     if (!request) {
//       throw new Error("Time off request not found");
//     }

//     if (request.status === TimeOffStatus.APPROVED) {
//       // If already approved, also delete the TimeOff record
//       return prisma.$transaction(async (tx) => {
//         await tx.timeOff.delete({
//           where: { requestId },
//         });

//         return tx.timeOffRequest.update({
//           where: { id: requestId },
//           data: {
//             status: TimeOffStatus.CANCELLED,
//           },
//         });
//       });
//     }

//     return prisma.timeOffRequest.update({
//       where: { id: requestId },
//       data: {
//         status: TimeOffStatus.CANCELLED,
//       },
//     });
//   }

//   // -------------------------------------------------------------
//   // UPDATE REQUEST (only if pending)
//   // -------------------------------------------------------------
//   static async updateRequest(
//     requestId: string,
//     data: {
//       startDate?: string | Date;
//       endDate?: string | Date;
//       reason?: string;
//     }
//   ) {
//     const request = await prisma.timeOffRequest.findUnique({
//       where: { id: requestId },
//     });

//     if (!request) {
//       throw new Error("Time off request not found");
//     }

//     if (request.status !== TimeOffStatus.PENDING) {
//       throw new Error("Cannot update non-pending request");
//     }

//     const updateData: any = {};

//     if (data.startDate) {
//       const startDate = typeof data.startDate === 'string'
//         ? parseISO(data.startDate)
//         : data.startDate;
      
//       if (!isValid(startDate)) {
//         throw new Error("Invalid start date");
//       }
//       updateData.startDate = startOfDay(startDate);
//     }

//     if (data.endDate) {
//       const endDate = typeof data.endDate === 'string'
//         ? parseISO(data.endDate)
//         : data.endDate;
      
//       if (!isValid(endDate)) {
//         throw new Error("Invalid end date");
//       }
//       updateData.endDate = endOfDay(endDate);
//     }

//     if (data.reason !== undefined) {
//       updateData.reason = data.reason;
//     }

//     return prisma.timeOffRequest.update({
//       where: { id: requestId },
//       data: updateData,
//     });
//   }

//   // -------------------------------------------------------------
//   // DELETE REQUEST (admin only, hard delete)
//   // -------------------------------------------------------------
//   static async deleteRequest(requestId: string) {
//     const request = await prisma.timeOffRequest.findUnique({
//       where: { id: requestId },
//     });

//     if (!request) {
//       throw new Error("Time off request not found");
//     }

//     if (request.status === TimeOffStatus.APPROVED) {
//       // Delete both request and time off
//       return prisma.$transaction(async (tx) => {
//         await tx.timeOff.delete({
//           where: { requestId },
//         });

//         return tx.timeOffRequest.delete({
//           where: { id: requestId },
//         });
//       });
//     }

//     return prisma.timeOffRequest.delete({
//       where: { id: requestId },
//     });
//   }
// }