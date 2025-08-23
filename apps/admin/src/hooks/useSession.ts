"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/utils/trpc";
import { AppRouter } from "../../../server/src/routers";
import { inferRouterOutputs } from "@trpc/server";
import { useQuery } from "@tanstack/react-query";

type Session = inferRouterOutputs<AppRouter>["admin"]["session"];
type AdminSessionHook = {
  session: Session | undefined;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => void;
};

export function useAdminSession(
  redirectTo: string = "/login"
): AdminSessionHook {
  const router = useRouter();
  const {
    data: session,
    isLoading,
    isError,
    isSuccess,
    isFetching,
    error,
    refetch,
  } = useQuery(trpc.admin.session.queryOptions(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  }))
  

  // redirect logic
  useEffect(() => {
    if (!isLoading && !session) {
      router.replace(redirectTo);
    }
  }, [isLoading, session, router, redirectTo]);

  return {
    session,
    isLoading,
    isError,
    isSuccess,
    isFetching,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}
