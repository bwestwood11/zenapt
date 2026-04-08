import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import prisma from "../../../../../prisma";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await request.headers,
    });

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get("locationId");
    const search = searchParams.get("search") || undefined;

    if (!locationId) {
      return new NextResponse("Location ID is required", { status: 400 });
    }

    // Verify user has access to this location
    const locationAccess = await prisma.locationEmployee.findFirst({
      where: {
        locationId,
        userId: session.user.id,
      },
    });

    if (!locationAccess) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Create a ReadableStream for streaming CSV data
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // CSV header
          const header =
            "ID,First Name,Last Name,Email,Phone Number,Date of Birth,Status,Notes,Created At,Updated At\n";
          controller.enqueue(encoder.encode(header));

          const batchSize = 100;
          let skip = 0;
          let hasMore = true;

          const where: Prisma.CustomerWhereInput = {
            location: { some: { id: locationId } },
            ...(search && {
              OR: [
                {
                  user: {
                    is: {
                      name: { contains: search, mode: "insensitive" as const },
                    },
                  },
                },
                {
                  user: {
                    is: {
                      email: { contains: search, mode: "insensitive" as const },
                    },
                  },
                },
                {
                  phoneNumber: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }),
          };

          // Fetch and stream customers in batches
          while (hasMore) {
            const customers = await prisma.customer.findMany({
              where,
              skip,
              take: batchSize,
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                phoneNumber: true,
                dateOfBirth: true,
                status: true,
                notes: true,
                createdAt: true,
                updatedAt: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            });

            if (customers.length === 0) {
              hasMore = false;
              break;
            }

            // Convert each customer to CSV row
            for (const customer of customers) {
              const [firstName = "", ...lastNameParts] = (
                customer.user?.name ?? ""
              )
                .trim()
                .split(/\s+/);
              const lastName = lastNameParts.join(" ");
              const row = [
                customer.id,
                escapeCSV(firstName),
                escapeCSV(lastName),
                escapeCSV(customer.user?.email || ""),
                escapeCSV(customer.phoneNumber || ""),
                customer.dateOfBirth ? customer.dateOfBirth.toISOString() : "",
                escapeCSV(customer.status || ""),
                escapeCSV(customer.notes || ""),
                customer.createdAt.toISOString(),
                customer.updatedAt.toISOString(),
              ].join(",");

              controller.enqueue(encoder.encode(row + "\n"));
            }

            skip += batchSize;

            // If we got fewer customers than the batch size, we're done
            if (customers.length < batchSize) {
              hasMore = false;
            }
          }

          controller.close();
        } catch (error) {
          console.error("Error streaming CSV:", error);
          controller.error(error);
        }
      },
    });

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `customers-${timestamp}.csv`;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error exporting customers:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Helper function to escape CSV values
function escapeCSV(value: string): string {
  if (!value) return "";

  // If the value contains comma, quote, or newline, wrap it in quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    // Escape quotes by doubling them
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}
