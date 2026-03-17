"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { TicketPercent, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PromoCodeSettingsSkeleton } from "./skeletons";

const promoSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Code should be at least 3 characters")
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, "Use only uppercase letters, numbers, _ or -"),
  description: z.string().trim().max(200).optional(),
  discount: z.number().int().min(1).max(100),
  maxUsage: z.number().int().min(1).max(100000).optional(),
});

type PromoFormValues = z.infer<typeof promoSchema>;

export function PromoCodeSettings({ locationId }: Readonly<{ locationId: string }>) {
  const queryClient = useQueryClient();

  const { data: promoCodes, isLoading } = useQuery(
    trpc.location.listLocationPromoCodes.queryOptions({ locationId }),
  );

  const { mutate: createPromoCode, isPending: isCreating } = useMutation(
    trpc.location.createLocationPromoCode.mutationOptions({
      onSuccess: () => {
        toast.success("Location promo code created");
        form.reset({ code: "", description: "", discount: 10, maxUsage: undefined });
        queryClient.invalidateQueries({
          queryKey: trpc.location.listLocationPromoCodes.queryKey({ locationId }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create promo code");
      },
    }),
  );

  const { mutate: updatePromoCode, isPending: isUpdating } = useMutation(
    trpc.location.updateLocationPromoCode.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.location.listLocationPromoCodes.queryKey({ locationId }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update promo code");
      },
    }),
  );

  const { mutate: deletePromoCode, isPending: isDeleting } = useMutation(
    trpc.location.deleteLocationPromoCode.mutationOptions({
      onSuccess: () => {
        toast.success("Promo code deleted");
        queryClient.invalidateQueries({
          queryKey: trpc.location.listLocationPromoCodes.queryKey({ locationId }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete promo code");
      },
    }),
  );

  const form = useForm<PromoFormValues>({
    resolver: zodResolver(promoSchema),
    defaultValues: {
      code: "",
      description: "",
      discount: 10,
      maxUsage: undefined,
    },
  });

  const disableActions = useMemo(
    () => isCreating || isUpdating || isDeleting,
    [isCreating, isUpdating, isDeleting],
  );

  let promoCodeListContent: React.ReactNode = (
    <p className="text-sm text-muted-foreground">
      No location-level promo codes yet.
    </p>
  );

  if (isLoading) {
    promoCodeListContent = <PromoCodeSettingsSkeleton />;
  } else if (promoCodes?.length) {
    promoCodeListContent = (
      <div className="space-y-2">
        {promoCodes.map((promoCode) => (
          <div
            key={promoCode.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{promoCode.code}</Badge>
                <span className="text-sm font-medium">{promoCode.discount}% off</span>
                <Badge variant={promoCode.isActive ? "default" : "outline"}>
                  {promoCode.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {promoCode.description ? (
                <p className="text-xs text-muted-foreground">{promoCode.description}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Max usage: {promoCode.maxUsage ?? "Unlimited"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disableActions}
                onClick={() => {
                  updatePromoCode({
                    locationId,
                    promoCodeId: promoCode.id,
                    isActive: !promoCode.isActive,
                  });
                }}
              >
                {promoCode.isActive ? "Disable" : "Enable"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={disableActions}
                onClick={() => {
                  deletePromoCode({
                    locationId,
                    promoCodeId: promoCode.id,
                  });
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return <PromoCodeSettingsSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TicketPercent className="size-5 text-primary" />
          <CardTitle>Location Promo Codes</CardTitle>
        </div>
        <CardDescription>
          Create and manage promo codes that apply only to this location.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={form.handleSubmit((values) => {
              createPromoCode({
                locationId,
                code: values.code.toUpperCase(),
                description: values.description?.trim() || undefined,
                discount: values.discount,
                maxUsage: values.maxUsage,
              });
            })}
          >
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="WELCOME10"
                      onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount %</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={field.value}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="Seasonal location offer" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxUsage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max usage (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      value={field.value ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        field.onChange(value ? Number(value) : undefined);
                      }}
                      placeholder="Unlimited if empty"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={disableActions}>
                Create promo code
              </Button>
            </div>
          </form>
        </Form>

        <div className="space-y-3">
          <Label>Existing location promo codes</Label>
          {promoCodeListContent}
        </div>
      </CardContent>
    </Card>
  );
}
