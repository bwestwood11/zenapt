"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { mutate: login, isPending: isSubmitting } = useMutation(
    trpc.admin.login.mutationOptions({
      onSuccess: () => {
        router.push("/");
      },
      onError: () => {
        toast.error("You Are Not Authorized");
      },
    })
  );
  const handleLogin = () => {
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    login({ email, password });
  };

  return (
    <div className="min-h-screen flex font-sans">
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ backgroundColor: "#3F3FF3" }}
      >
        <div className="relative z-10 flex flex-col justify-between w-full px-12 py-12">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
              <div
                className="w-4 h-4 rounded-sm"
                style={{ backgroundColor: "#3F3FF3" }}
              ></div>
            </div>
            <h1 className="text-xl font-semibold text-white">Frello</h1>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-4xl text-white mb-6 leading-tight">
              Effortlessly manage your team and operations.
            </h2>
            <p className="text-white/90 text-lg leading-relaxed">
              Log in to access your CRM dashboard and manage your team.
            </p>
          </div>

          <div className="flex justify-between items-center text-white/70 text-sm">
            <span>Copyright © 2025 Frello Enterprises LTD.</span>
            <span className="cursor-pointer hover:text-white/90">
              Privacy Policy
            </span>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-8">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: "#3F3FF3" }}
            >
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <h1 className="text-xl font-semibold text-foreground">Frello</h1>
          </div>

          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl text-foreground">Login</h2>
              <p className="text-muted-foreground">
                Enter your email and password to access your account.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@company.com"
                  className="h-12 border-gray-200 focus:ring-0 shadow-none rounded-lg bg-white focus:border-[#3F3FF3]"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-10 border-gray-200 focus:ring-0 shadow-none rounded-lg bg-white focus:border-[#3F3FF3]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <Button
              className="w-full h-12 text-sm font-medium text-white hover:opacity-90 rounded-lg shadow-none cursor-pointer"
              onClick={handleLogin}
              style={{ backgroundColor: "#3F3FF3" }}
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
