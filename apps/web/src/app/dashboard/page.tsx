"use client";

import { authClient } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { WithPermissions } from "@/lib/permissions/usePermissions";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const {} = useQuery(trpc.permissions.getPermission.queryOptions());
  
  useEffect(() => {
    if (!session && !isPending) {
      router.push("/login");
    }
  }, [session, isPending]);

  if (isPending) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {session?.user.name}</p>

      <WithPermissions required={["CREATE::EMPLOYEES"]}>
        <button>Create Employee</button>
      </WithPermissions>
      <WithPermissions required={["READ::ANALYTICS"]}>
        <div>Analytics Data</div>
      </WithPermissions>
      <WithPermissions required={["READ::LOCATION"]} locationId="loc123">
        <div>Update Analytics Data</div>
      </WithPermissions>
      <WithPermissions required={["UPDATE::LOCATION"]}>
        <button>Update Location</button>
      </WithPermissions>
      <WithPermissions required={["READ::SERVICES"]}>
        <div>Services Data</div>
      </WithPermissions>
      <WithPermissions required={["READ::SUBSCRIPTION"]}>
        <div>Subscription Data</div>
      </WithPermissions>
    </div>
  );
}
