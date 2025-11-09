"use client";

import { authClient } from "@/lib/auth-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { forbidden, useRouter } from "next/navigation";
import { useEffect } from "react";
import { WithPermissions } from "@/lib/permissions/usePermissions";
import { Button } from "@/components/ui/button";
import { SetBreadcrumbs } from "@/components/breadcrumbs";

// This is navigation route 
// So if user comes to this he will decide what he wants to go. to his management dashboard, to his location dashboard.

// 1. If Management lands on this page what to show
// 2. If Location member lands what to show

export default function Dashboard() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const {} = useQuery(trpc.permissions.getPermission.queryOptions());
  const { mutate } = useMutation(
    trpc.invitation.inviteOrganizationMember.mutationOptions()
  );
  
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
      <SetBreadcrumbs items={[{href: "/dashboard", label: "Dashboard"}]}/>
      <Button
        onClick={() =>
          mutate({
            email: "brett222@gmail.com",
            role: "ANALYST",
            name: "Brett",
          })
        }
      >
        Send Invite
      </Button>
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
      <WithPermissions required={["READ::SERVICE"]}>
        <div>Services Data</div>
      </WithPermissions>
      <WithPermissions required={["READ::SUBSCRIPTION"]}>
        <div>Subscription Data</div>
      </WithPermissions>
    </div>
  );
}
