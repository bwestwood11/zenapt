import { createAuthClient } from "better-auth/react";
import { customSessionClient } from "better-auth/client/plugins";
import type { auth } from "../../../server/src/lib/auth";

export const authClient = createAuthClient({
  plugins: [
    customSessionClient<typeof auth>()
  ],
  baseURL:
      process.env.NEXT_PUBLIC_SERVER_URL,
});
