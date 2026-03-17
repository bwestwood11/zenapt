"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { HandCoins, Plus, X } from "lucide-react";

import { trpc } from "@/utils/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TipSettingsSkeleton } from "./skeletons";

const QUICK_TIP_OPTIONS = [10, 15, 18, 20, 22, 25, 30];
const MIN_TIP_PERCENTAGE = 1;
const MAX_TIP_PERCENTAGE = 100;
const MAX_TIP_PRESETS = 10;

const tipSettingsSchema = z
  .object({
    tipEnabled: z.boolean(),
    tipPresetPercentages: z
      .array(
        z.number().int().min(MIN_TIP_PERCENTAGE).max(MAX_TIP_PERCENTAGE)
      )
      .min(1)
      .max(MAX_TIP_PRESETS),
  })
  .refine(
    (values) => !values.tipEnabled || values.tipPresetPercentages.length > 0,
    {
      message: "Select at least one preset when tip is enabled.",
      path: ["tipPresetPercentages"],
    }
  );

type TipSettingsFormData = z.infer<typeof tipSettingsSchema>;

function normalizeTipPresets(values: number[]) {
  return [...new Set(values)]
    .filter(
      (value) => value >= MIN_TIP_PERCENTAGE && value <= MAX_TIP_PERCENTAGE
    )
    .sort((a, b) => a - b);
}

function toggleTipPreset(currentValues: number[], preset: number) {
  if (currentValues.includes(preset)) {
    return currentValues.filter((value) => value !== preset);
  }

  return normalizeTipPresets([...currentValues, preset]);
}

function removeTipPreset(currentValues: number[], preset: number) {
  return currentValues.filter((value) => value !== preset);
}

function parseCustomTipPreset(value: string) {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function getTipPresetErrorMessage(
  parsedValue: number | null,
  currentValues: number[]
) {
  if (parsedValue === null) {
    return "Enter a whole number percentage.";
  }

  if (parsedValue < MIN_TIP_PERCENTAGE || parsedValue > MAX_TIP_PERCENTAGE) {
    return `Tip must be between ${MIN_TIP_PERCENTAGE}% and ${MAX_TIP_PERCENTAGE}%.`;
  }

  if (currentValues.includes(parsedValue)) {
    return "This tip preset already exists.";
  }

  if (currentValues.length >= MAX_TIP_PRESETS) {
    return `You can add up to ${MAX_TIP_PRESETS} tip presets.`;
  }

  return null;
}

export function TipSettings({
  locationId,
}: Readonly<{
  locationId: string;
}>) {
  const [customPresetInput, setCustomPresetInput] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    trpc.location.fetchLocationAppointmentSettings.queryOptions({ locationId })
  );

  const { mutate, isPending } = useMutation(
    trpc.location.updateLocationTipSettings.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.location.fetchLocationAppointmentSettings.queryKey({
            locationId,
          }),
        });
      },
    })
  );

  const defaultValues = useMemo<TipSettingsFormData>(() => {
    return {
      tipEnabled: data?.appointmentSettings?.tipEnabled ?? false,
      tipPresetPercentages:
        data?.appointmentSettings?.tipPresetPercentages?.length
          ? normalizeTipPresets(data.appointmentSettings.tipPresetPercentages)
          : [15, 20, 25],
    };
  }, [data]);

  const form = useForm<TipSettingsFormData>({
    resolver: zodResolver(tipSettingsSchema),
    values: defaultValues,
  });

  const tipEnabled = form.watch("tipEnabled");

  if (isLoading) return <TipSettingsSkeleton />;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          mutate({
            locationId,
            tipEnabled: values.tipEnabled,
            tipPresetPercentages: [...new Set(values.tipPresetPercentages)].sort(
              (a, b) => a - b
            ),
          });
        })}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HandCoins className="size-5 text-primary" />
              <CardTitle>Tip Settings</CardTitle>
            </div>
            <CardDescription>
              Enable tip collection and choose the percentage presets customers
              will see during checkout.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="tipEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                  <div className="space-y-1">
                    <FormLabel>Enable tips for this location</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      When disabled, the tip panel will not be shown to
                      customers.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipPresetPercentages"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Tip percentage presets</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Choose quick presets or add custom percentages. Customers
                    can pick from these values in the tip panel.
                  </p>

                  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Quick add
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_TIP_OPTIONS.map((preset) => {
                        const selected = field.value.includes(preset);
                        return (
                          <Button
                            key={preset}
                            type="button"
                            variant={selected ? "default" : "outline"}
                            size="sm"
                            disabled={!tipEnabled}
                            onClick={() => {
                              const updated = toggleTipPreset(field.value, preset);
                              field.onChange(updated);
                            }}
                          >
                            {preset}%
                          </Button>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Add custom
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={customPresetInput}
                          disabled={!tipEnabled}
                          placeholder="e.g. 28"
                          inputMode="numeric"
                          onChange={(event) => {
                            form.clearErrors("tipPresetPercentages");
                            setCustomPresetInput(event.target.value);
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") {
                              return;
                            }

                            event.preventDefault();
                            if (!tipEnabled) {
                              return;
                            }

                            const parsedValue = parseCustomTipPreset(
                              customPresetInput
                            );
                            const errorMessage = getTipPresetErrorMessage(
                              parsedValue,
                              field.value
                            );

                            if (errorMessage) {
                              form.setError("tipPresetPercentages", {
                                message: errorMessage,
                              });
                              return;
                            }

                            field.onChange(
                              normalizeTipPresets([...field.value, parsedValue!])
                            );
                            setCustomPresetInput("");
                            form.clearErrors("tipPresetPercentages");
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!tipEnabled}
                          onClick={() => {
                            const parsedValue = parseCustomTipPreset(
                              customPresetInput
                            );
                            const errorMessage = getTipPresetErrorMessage(
                              parsedValue,
                              field.value
                            );

                            if (errorMessage) {
                              form.setError("tipPresetPercentages", {
                                message: errorMessage,
                              });
                              return;
                            }

                            field.onChange(
                              normalizeTipPresets([...field.value, parsedValue!])
                            );
                            setCustomPresetInput("");
                            form.clearErrors("tipPresetPercentages");
                          }}
                        >
                          <Plus className="mr-1 size-4" />
                          Add
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Selected presets ({field.value.length}/{MAX_TIP_PRESETS})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {field.value.map((preset) => (
                          <Badge
                            key={preset}
                            variant="secondary"
                            className="gap-1 px-2 py-1"
                          >
                            <span>{preset}%</span>
                            <button
                              type="button"
                              disabled={!tipEnabled}
                              className="inline-flex items-center justify-center rounded-sm p-0.5 hover:bg-background/80 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => {
                                field.onChange(removeTipPreset(field.value, preset));
                              }}
                              aria-label={`Remove ${preset}% tip preset`}
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              disabled={isPending}
              type="submit"
              className="ml-auto flex w-fit cursor-pointer"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
