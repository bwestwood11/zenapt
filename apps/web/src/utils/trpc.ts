import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { AppRouter } from "../../../server/src/routers";
import { toast } from "sonner";
import SuperJSON from "superjson";

const getCurrentLocationSlug = () => {
  if (globalThis.window === undefined) {
    return undefined;
  }

  const locationSlugPattern = /^\/dashboard\/l\/([^/]+)/;
  const match = locationSlugPattern.exec(globalThis.window.location.pathname);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(error.message, {
        action: {
          label: "retry",
          onClick: () => {
            queryClient.invalidateQueries();
          },
        },
      });
    },
  }),
});

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      transformer: SuperJSON,
      url: `${process.env.NEXT_PUBLIC_SERVER_URL}/trpc`,
      fetch(url, options) {
        const headers = new Headers(options?.headers ?? undefined);
        const locationSlug = getCurrentLocationSlug();

        if (locationSlug) {
          headers.set("x-location-slug", locationSlug);
        }

        return fetch(url, {
          ...options,
          headers,
          credentials: "include",
        });
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
