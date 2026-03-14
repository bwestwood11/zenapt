"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

interface ExportCustomersButtonProps {
  locationId: string;
}

export function ExportCustomersButton({
  locationId,
}: ExportCustomersButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const searchParams = useSearchParams();
  const search = searchParams.get("search");

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Build the export URL with query parameters
      const params = new URLSearchParams({
        locationId,
        ...(search && { search }),
      });

      const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/customers/export?${params.toString()}`;

      // Trigger the download
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to export customers");
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || "customers-export.csv";

      // Create a blob from the response
      const blob = await response.blob();

      // Create a temporary link and trigger download
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error exporting customers:", error);
      // You might want to show a toast notification here
      alert("Failed to export customers. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
      size="sm"
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
