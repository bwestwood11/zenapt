import { cookies } from "next/headers";
import "server-only";

const TOKEN_KEY = "admin_token";

export const getServerSession = async () => {
  const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/admin/session`;
  const ck = await cookies();
  const token = ck.get(TOKEN_KEY)

    if(!token) return null

  const response = await fetch(url, {
    headers: {
      Cookie: `${TOKEN_KEY}=${token.value}`, // manually attach cookie
    },
  });

  
  const session = await response.json()

    return session;
};
