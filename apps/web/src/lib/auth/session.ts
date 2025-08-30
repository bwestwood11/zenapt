import "server-only"
import { authClient } from "../auth-client";
import { headers } from "next/headers";


export const getSession = async () => {
    return authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });
}

