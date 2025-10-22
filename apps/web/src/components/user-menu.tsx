"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Plus, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

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
            {/* <AvatarImage src="https://avatar.vercel.sh/diwanshumidha" alt="Diwanshu Midha" /> */}
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
      <DropdownMenuContent
        className="w-80 bg-[#1a1a1a] border-[#2a2a2a]"
        align="end"
      >
        <div className="flex items-center gap-3 p-4">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src="https://avatar.vercel.sh/diwanshumidha"
              alt="Diwanshu Midha"
            />
            <AvatarFallback>
              {session.user.name
                .split(" ")
                .map((v) => v[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <p className="text-sm font-medium text-white">
              {session.user.name}
            </p>
          </div>
        </div>

        <div className="px-2 pb-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-[#2a2a2a] border-[#3a3a3a] text-white hover:bg-[#3a3a3a] hover:text-white"
            >
              <Settings className="mr-2 h-4 w-4" />
              Manage account
            </Button>
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
              className="flex-1 bg-[#2a2a2a] border-[#3a3a3a] text-white hover:bg-[#3a3a3a] hover:text-white"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-[#2a2a2a]" />

        <DropdownMenuItem className="cursor-pointer text-white hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] focus:text-white mx-2 my-1">
          <Plus className="mr-2 h-4 w-4" />
          Add account
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[#2a2a2a]" />

        <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-400">
          <span>Secured by</span>
          <span className="font-semibold text-white">Better Auth</span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
