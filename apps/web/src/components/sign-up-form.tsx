"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "../utils/trpc";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const formSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof formSchema>;

export default function SignUpForm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { mutate: signUp } = useMutation(trpc.auth.signUp.mutationOptions());
  const router = useRouter();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: email,
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: FormData) => {
    try {
      signUp({
        name: data.name,
        email: data.email,
        password: data.password,
        token: token,
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Sign-up failed:", error);
      toast.error("Sign-up failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 bg-background">
        <div className="w-full max-w-sm mx-auto ">
          <div className="flex items-center mb-12">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mr-3">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <span className="text-xl font-semibold text-gray-900">ZenApt</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              The Booking Management
            </h1>
            <p className="text-foreground">
              Create your account to get started with ZenApt.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-medium">
                      Name*
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your name"
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-medium">
                      Email*
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled
                        className="h-12 bg-gray-50 border-gray-300 text-gray-600"
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
                      Password*
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          {...field}
                          className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-medium">
                      Confirm Password*
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          {...field}
                          className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg"
              >
                Create Account
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/sign-in/email"
              className="font-medium text-gray-900 hover:underline"
            >
              Login Here
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-primary"></div>

        <div className="relative z-10 flex flex-col justify-center items-center p-12 space-y-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 w-80 shadow-xl">
            <div className="text-white/80 text-sm mb-2">Analytics Overview</div>
            <div className="flex items-end space-x-2 mb-4">
              <div className="bg-purple-300 h-8 w-4 rounded"></div>
              <div className="bg-purple-300 h-12 w-4 rounded"></div>
              <div className="bg-purple-300 h-6 w-4 rounded"></div>
              <div className="bg-purple-300 h-16 w-4 rounded"></div>
              <div className="bg-purple-300 h-10 w-4 rounded"></div>
              <div className="bg-purple-300 h-20 w-4 rounded"></div>
            </div>
            <div className="text-white/60 text-xs">
              Insights into the effectiveness of our recent strategies and
              content approach.
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 w-80 shadow-xl">
            <div className="text-white text-lg font-medium mb-2">
              "Basement is surprisingly handy for..."
            </div>
            <div className="text-white/60 text-sm">
              Customer testimonial highlighting the effectiveness of the
              platform.
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 w-80 shadow-xl">
            <div className="text-white text-lg font-medium mb-2">
              TOTAL SALES
            </div>
            <div className="flex items-baseline space-x-2 mb-2">
              <div className="text-white text-3xl font-bold">$527.8K</div>
              <div className="bg-green-400 text-green-900 text-xs px-2 py-1 rounded">
                +32%
              </div>
            </div>
            <div className="text-white/60 text-xs mb-4">last month</div>
            <div className="text-white/60 text-xs mb-4">
              This amount of total sales highlights the effectiveness of our
              recent strategies and content approach.
            </div>

            <div className="flex items-end justify-center space-x-2">
              <div className="bg-white/30 h-8 w-8 rounded"></div>
              <div className="bg-yellow-400 h-12 w-8 rounded"></div>
              <div className="bg-blue-400 h-10 w-8 rounded"></div>
            </div>
            <div className="flex justify-center space-x-4 mt-2 text-xs text-white/60">
              <span>Social Media</span>
              <span>TV & Radio</span>
              <span>Billboards</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
