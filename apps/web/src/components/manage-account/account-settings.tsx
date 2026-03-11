"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { ProfileImageSection } from "./profile-image-section";
import { PersonalInfoForm } from "./personal-information";
import { AccountActions } from "./account-actions";
import { Card } from "../ui/card";
import { ThemeToggleOptions } from "../theme-toggle-options";

// ---------------- AccountSettings -----------------
export function AccountSettings() {
  const { isPending, data } = authClient.useSession();
  const [avatarUrl, setAvatarUrl] = useState(data?.user.image || "");
  const resolvedRole =
    data?.user.management?.role ?? data?.user.employees?.[0]?.role;

  useEffect(() => {
    setAvatarUrl(data?.user.image || "");
  }, [data?.user.image]);

  const isProfileImageChanged = useMemo(
    () => data?.user.image !== avatarUrl,
    [avatarUrl, data?.user.image],
  );

  if (isPending) return <p>Loading...</p>;
  if (!data?.user.email || !resolvedRole || !data?.user.name)
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
        role={resolvedRole}
      />
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Appearance</h2>
            <p className="text-sm text-muted-foreground">
              Choose your preferred theme
            </p>
          </div>
          <ThemeToggleOptions
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            buttonClassName="w-full justify-center"
          />
        </div>
      </Card>
      <AccountActions />
    </div>
  );
}
