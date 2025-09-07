import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createServerSideHelpers } from "@trpc/react-query/server";
import superjson from "superjson";
import type { AppRouter } from "../../../server/src/routers";
import { headers } from "next/headers";

const proxyClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      async fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
          headers: await headers(),
        });
      },
      transformer: superjson,
      url: `${process.env.NEXT_PUBLIC_SERVER_URL}/trpc` as string,
    }),
  ],
});
export const serverTRPC = createServerSideHelpers({
  client: proxyClient,
});
