"use client"

import { useCallback, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { getFileChecksum } from "../../../../server/src/lib/s3/utils";
import { base64ToFile, getInitials } from "./utils";
import { Loader2 } from "lucide-react";
import { AvatarDialog } from "./avatar-dialog";

export const ProfileImageSection = ({
  avatarUrl,
  setAvatarUrl,
  name,
  isProfileImageChanged,
}: {
  avatarUrl: string;
  setAvatarUrl: React.Dispatch<React.SetStateAction<string>>;
  name: string;
  isProfileImageChanged: boolean;
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { refetch } = authClient.useSession();

  const { mutateAsync: getSignedUrlForProfileUpdate } = useMutation(
    trpc.auth.getSignedUrlForProfileUpdate.mutationOptions()
  );
  const { mutateAsync: updateProfileImage, isPending } = useMutation(
    trpc.auth.updateProfileImage.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    })
  );

  const onLogoUpload = useCallback(async () => {
    if (!avatarUrl) {
      return;
    }

    try {
      setIsProcessing(true);
      let finalUrl = avatarUrl;

      if (avatarUrl.startsWith("data:")) {
        const file = await base64ToFile(avatarUrl);

        const checksum = await getFileChecksum(file, "SHA-256");
        const { signedUrl, url } = await getSignedUrlForProfileUpdate({
          mimeType: file.type,
          checksum,
          filesize: file.size,
        });

        if (!signedUrl || !url) throw new Error("Failed to get upload URL");

        const upload = await fetch(signedUrl, { method: "PUT", body: file });
        if (!upload.ok) throw new Error("Failed to upload image");

        finalUrl = url;
      }

      await updateProfileImage({ url: finalUrl });
      setIsProcessing(false);
    } catch (err: any) {
      setIsProcessing(false);
    }
  }, [avatarUrl, getSignedUrlForProfileUpdate, updateProfileImage]);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Profile Image</h2>
          <p className="text-sm text-muted-foreground">
            Update your profile photo
          </p>
        </div>

        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={name} />
            <AvatarFallback className="text-2xl">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>

          <AvatarDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onAvatarSelect={setAvatarUrl}
            setAvatarUrl={setAvatarUrl}
          />

          {isProfileImageChanged && (
            <Button onClick={onLogoUpload} disabled={isProcessing}>
              {isProcessing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isProcessing ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};