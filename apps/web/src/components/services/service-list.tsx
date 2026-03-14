"use client";

import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { confirm } from "../ui/confirm";

export function ServiceList() {
  const { data: services, isLoading } = useQuery(
    trpc.services.getAllServicesTerms.queryOptions()
  );

  const queryClient = useQueryClient();

  const { mutate } = useMutation(
    trpc.services.deleteServiceTerm.mutationOptions({
      onMutate: async (removedService) => {
        const queryKey = trpc.services.getAllServicesTerms.queryKey();
        // Cancel any outgoing refetches
        // (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries({ queryKey: queryKey });

        // Snapshot the previous value
        const prev = queryClient.getQueryData(queryKey);

        // Optimistically update to the new value
        queryClient.setQueryData(queryKey, (old) => {
          if (!old) return old;
          const idToRemove = removedService.serviceId;
          return old.map((group) => ({
            ...group,
            serviceTerms: group.serviceTerms.filter((s) => s.id !== idToRemove),
          }));
        });

        // Return a context object with the snapshotted value
        return { prev };
      },
      // If the mutation fails,
      // use the context returned from onMutate to roll back
      onError: (err, newTodo, context) => {
        queryClient.setQueryData(
          trpc.services.getAllServicesTerms.queryKey(),
          context?.prev || []
        );
      },
      // Always refetch after error or success:
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.services.getAllServicesTerms.queryKey(),
        });
      },
    })
  );

  const onDelete = async (id: string) => {
    const shouldDelete = await confirm({
      title: "Do you want to delete the Service?",
      confirmText: "Delete Service",
      description: "This is immutable and cannot be reverted once deleted",
    });
    if (shouldDelete) {
      mutate({ serviceId: id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-border bg-muted/30">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Getting Services</p>
          <p className="mt-1 text-sm text-muted-foreground">Wait a while</p>
        </div>
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-border bg-muted/30">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No services yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by adding your first service
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {services.map((group) => (
        <div key={group.id}>
          <h2 className="mb-6 text-xl font-medium text-foreground">
            {group.name}
          </h2>
          <div className="space-y-1">
            {group.serviceTerms.map((service, index) => (
              <div
                key={service.id}
                className="group flex items-center justify-between border-b border-border py-6 transition-colors hover:bg-muted/30"
              >
                <div className="flex-1">
                  <div className="flex items-baseline gap-4">
                    <h3 className="text-lg font-medium text-foreground">
                      {service.name}
                    </h3>
                    <span className="text-base font-medium text-primary">
                      ${(service.minimumPrice / 100).toFixed(2)}
                    </span>
                  </div>
                  <p>{service.excerpt}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(service.id)}
                  className="ml-4 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                  <span className="sr-only">Delete service</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
