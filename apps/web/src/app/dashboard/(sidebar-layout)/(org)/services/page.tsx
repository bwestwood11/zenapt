"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import type { Service } from "@/lib/types/services";
import { ServiceList } from "@/components/services/service-list";
import { AddServiceModal } from "@/components/services/add-service-modal";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export default function ServicesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { mutate } = useMutation(
    trpc.services.createServiceTerms.mutationOptions({})
  );

  const handleAddService = (service: Omit<Service, "id">) => {
    mutate({
      groupId: service.group,
      name: service.name,
      minPrice: service.price,
      description: service.description,
      excerpt: service.excerpt,
    });
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {/* Header */}
        <div className="mb-12 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-foreground">
              Services
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              Manage your med spa service offerings
            </p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="gap-2"
            size="lg"
          >
            <Plus className="h-4 w-4" />
            Add Service
          </Button>
        </div>

        {/* Services List */}
        <ServiceList />

        {/* Add Service Modal */}
        <AddServiceModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSubmit={handleAddService}
        />
      </div>
    </div>
  );
}
