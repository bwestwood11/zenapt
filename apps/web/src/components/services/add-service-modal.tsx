"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus } from "lucide-react";
import { SimpleEditor } from "../tiptap/TipTap";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

interface AddServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (service: {
    name: string;
    price: number;
    description: string;
    group: string;
    excerpt: string;
  }) => void;
}

type FormData = {
  name: string;
  price: string;
  description: string;
  group: string;
  excerpt: string;
};

function getExcerpt(text: string, wordLimit = 55) {
  if (!text) return "";

  const words = text.trim().split(/\s+/); // Split by any whitespace
  if (words.length <= wordLimit) return text.trim();

  return words.slice(0, wordLimit).join(" ") + "…"; // Add ellipsis
}

export function AddServiceModal({
  open,
  onOpenChange,
  onSubmit,
}: AddServiceModalProps) {
  // const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const { data: groups, refetch } = useQuery(
    trpc.services.getAllGroups.queryOptions()
  );
  const { mutate: createGroup, isPending } = useMutation(
    trpc.services.createServiceGroup.mutationOptions({
      onSuccess(data, variables, context) {
        setIsCreatingGroup(false);
        setNewGroupName("");
        refetch();
        // Optimistic
      },
    })
  );

  const form = useForm<FormData>({
    defaultValues: {
      name: "",
      price: "",
      description: "",
      group: "",
      excerpt: "",
    },
  });

  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      name: data.name.trim(),
      price: Number.parseFloat(data.price),
      description: data.description.trim(),
      excerpt: data.excerpt.trim(),
      group: data.group.trim(),
    });

    form.reset();
    setIsCreatingGroup(false);
    setNewGroupName("");
  };

  const handleCreateGroup = () => {
    createGroup({
      name: newGroupName,
    });
  };

  const handleCancel = () => {
    form.reset();
    setIsCreatingGroup(false);
    setNewGroupName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light">
            Add New Service
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new service offering for your med spa. All fields are
            required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-6"
          >
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Service name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Service Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Hydrafacial" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Price */}
            <FormField
              control={form.control}
              name="price"
              rules={{
                required: "Price is required",
                validate: (v) => parseFloat(v) >= 0 || "Price must be positive",
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Price <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              rules={{ required: "Description is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="h-40 border rounded-md">
                      <Controller
                        name="description"
                        control={form.control}
                        render={({ field }) => (
                          <SimpleEditor
                            initialContent={field.value}
                            onChange={({ html, text }) => {
                              field.onChange(html);
                              form.setValue("excerpt", getExcerpt(text));
                            }}
                          />
                        )}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Group */}
            <FormField
              control={form.control}
              name="group"
              rules={{ required: "Service group is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Service Group <span className="text-destructive">*</span>
                  </FormLabel>
                  <Alert className="mb-3 bg-primary/5 border-primary/20">
                    <AlertDescription className="text-sm text-muted-foreground">
                      Tip: If you don&apos;t have a specific group, create one
                      called "Other Services".
                    </AlertDescription>
                  </Alert>
                  {!isCreatingGroup ? (
                    <FormControl>
                      <Select
                        onValueChange={(value) => {
                          if (value === "create-new") {
                            setIsCreatingGroup(true);
                          } else {
                            field.onChange(value);
                          }
                        }}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a group" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups?.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                          <SelectItem
                            value="create-new"
                            className="text-primary"
                          >
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Create New Group
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Enter group name"
                        className="h-11"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCreateGroup();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={handleCreateGroup}
                        disabled={!newGroupName.trim()}
                        isLoading={isPending}
                      >
                        Create
                      </Button>
                      <Button
                        isLoading={isPending}
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreatingGroup(false);
                          setNewGroupName("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">Add Service</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
