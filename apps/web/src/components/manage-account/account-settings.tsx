"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { ProfileImageSection } from "./profile-image-section";
import { PersonalInfoForm } from "./personal-information";
import { AccountActions } from "./account-actions";

// ---------------- AccountSettings -----------------
export function AccountSettings() {
  const { isPending, data } = authClient.useSession();
  const [avatarUrl, setAvatarUrl] = useState(data?.user.image || "");

  useEffect(() => {
    setAvatarUrl(data?.user.image || "");
  }, [data?.user.image]);

  const isProfileImageChanged = useMemo(
    () => data?.user.image !== avatarUrl,
    [avatarUrl, data?.user.image]
  );

  if (isPending) return <p>Loading...</p>;
  if (!data?.user.email || !data?.user.management?.role || !data?.user.name)
    return <p>Account not configured</p>;

  return (
    <div className="space-y-6">
      <ProfileImageSection
        avatarUrl={avatarUrl}
        setAvatarUrl={setAvatarUrl}
        name={data.user.name}
        isProfileImageChanged={isProfileImageChanged}
      />
      <PersonalInfoForm
        name={data.user.name}
        email={data.user.email}
        role={data.user.management.role}
      />
      <AccountActions />
    </div>
  );
}
