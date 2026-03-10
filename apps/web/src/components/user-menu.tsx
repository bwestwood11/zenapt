"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { Button, buttonVariants } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ThemeToggleOptions } from "./theme-toggle-options";

export default function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!session) {
    return (
      <Button variant="outline" asChild>
        <Link href="/login">Sign In</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            {session.user.image ? (
              <AvatarImage src={session.user.image} alt={session.user.name} />
            ) : null}
            <AvatarFallback>
              {session.user.name
                .split(" ")
                .map((v) => v[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="" align="end">
        <div className="flex items-center gap-3 p-4">
          <Avatar className="h-12 w-12">
            {session.user.image ? (
              <AvatarImage
                src={session.user.image ?? ""}
                alt={session.user.name}
              />
            ) : null}
            <AvatarFallback>
              {session.user.name
                .split(" ")
                .map((v) => v[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-semibold truncate">{session.user.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {session.user.management?.role ? session.user.management.role.toLowerCase() : "user"}
              </span>
              <span className="text-xs text-gray-500 truncate">{session.user.email}</span>
            </div>
          </div>
        </div>

        <div className="px-2 pb-2">
          <div className="flex gap-2">
            <Link className={buttonVariants({variant: "outline", className: "flex-1 bg-transparent", size: "sm"})} href="/dashboard/manage-account">
              <Settings className="mr-2 h-4 w-4" />
              Manage account
            </Link>
            <Button
              onClick={() => {
                authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      router.push("/");
                    },
                  },
                });
              }}
              variant="outline"
              size={"sm"}
              className="flex-1 bg-transparent"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator className="" />

        <div className="px-2 pb-2">
          <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">
            Theme
          </p>
          <ThemeToggleOptions
            className="grid grid-cols-3 gap-2"
            buttonClassName="w-full justify-center"
          />
        </div>

        <DropdownMenuSeparator className="" />

        <div className="flex items-center justify-center gap-2 py-3 text-xs">
          <span>Secured by</span>
          <span className="font-semibold">Better Auth</span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
