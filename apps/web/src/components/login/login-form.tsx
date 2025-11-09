"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  email: z.email(),
  password: z.string(),
});

type FormValues = z.infer<typeof schema>;

export default function LoginForm() {
  const router = useRouter();

  const form = useForm<FormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    await authClient.signIn.email(
      {
        email: values.email,
        password: values.password,
      },
      {
        onSuccess: () => {
          router.push("/dashboard");
          form.clearErrors("root");
        },
        onError: (error) => {
          toast.error(error.error.message || error.error.statusText);
          form.setError("root", {
            message:
              error.error.status === 401
                ? "Invalid email or password"
                : "Something went wrong",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side with illustration */}
      <div className="relative hidden lg:flex flex-col col-span-1 items-center justify-center p-8 bg-background text-white">
        <div className="max-w-md mx-auto text-center text-primary space-y-6">
          <Image
            src="/logo.svg"
            alt="Zenapt logo"
            width={300}
            height={300}
            className="mx-auto"
          />
          <Image
            src="/logo-text.svg"
            alt="Zenapt logo text"
            width={300}
            height={300}
            className="mx-auto"
          />
          <p className="text-md">The Luxury Standard in Med Spa Management</p>
        </div>
      </div>

      {/* Right side with login form */}
      <div className="flex flex-col items-center col-span-1 justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="">
            <h1 className="text-2xl font-script mb-3">
              <Image
                src="/logo.svg"
                alt="Zenapt logo"
                width={30}
                height={30}
                className="mx-auto inline-block mr-2"
              />
              Zenapt
            </h1>
            <div className="mb-8">
              <h2 className="text-3xl font-semibold mb-2">
                Login To get Started
              </h2>
              <p className="text-foreground">
                Experience the future of med spa management today!
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-medium">
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        inputMode="email"
                        autoComplete="email"
                        aria-label="Email address"
                        placeholder="john@doe.com"
                        {...field}
                        className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-medium">
                      Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Password"
                        autoComplete="current-password"
                        aria-label="Password"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className="h-12 bg-gray-50 border-gray-300 text-gray-600"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                isLoading={form.formState.isSubmitting}
                className="w-full bg-primary hover:bg-primary/70 text-white cursor-pointer"
              >
                {form.formState.isSubmitting ? "Logging in..." : "Login"}
              </Button>
              {form.formState.errors.root?.message && (
                <p className="text-destructive bg-red-100 p-2.5 rounded rounded-lg text-center">
                  {form.formState.errors.root?.message}
                </p>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
