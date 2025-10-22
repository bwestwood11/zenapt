import { Upload, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { AVATARS } from "./constants";
import { CropModal } from "./crop-modal";

export const AvatarDialog = ({
  open,
  onOpenChange,
  onAvatarSelect,
  setAvatarUrl,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAvatarSelect: (url: string) => void;
  setAvatarUrl: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const [dropError, setDropError] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [nonCropSrc, setNonCropSrc] = useState<string | null>(null);

  const handleCropComplete = async (blob: Blob) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    setAvatarUrl(dataUrl);
    onOpenChange(false);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        setIsCropOpen(true);
        setNonCropSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    maxFiles: 1,
    accept: { "image/*": [] },
    maxSize: 2 * 1024 * 1024,
    onDropRejected: () =>
      setDropError("Please upload a valid image (max 2MB)."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" /> Change profile image
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Update profile image</DialogTitle>
          <DialogDescription>
            Upload your image or choose a premade avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {nonCropSrc ? (
            <CropModal
              open={isCropOpen}
              imageSrc={nonCropSrc}
              onClose={() => {
                setIsCropOpen(false);
              }}
              onCropComplete={handleCropComplete}
            />
          ) : null}
          {/* Upload */}
          <div {...getRootProps()} className="space-y-3 w-full ">
            <h3 className="text-sm font-medium">Upload Image</h3>
            <Label
              htmlFor="avatar-upload"
              className="cursor-pointer w-full"
            >
              <div className="flex w-full  items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-primary bg-muted/50 hover:bg-muted px-6 py-8 transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Click to upload
                </span>
              </div>
              <Input {...getInputProps()} />
            </Label>
            <p className="text-xs text-muted-foreground text-center">
              JPG, PNG, GIF, WebP — Max 2MB
            </p>
            {dropError && (
              <p className="text-xs text-destructive text-center">
                {dropError}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              or choose avatar
            </span>
          </div>

          {/* Avatars */}
          <div className="grid grid-cols-5 gap-3">
            {AVATARS.map((avatar, i) => (
              <button
                key={avatar}
                onClick={() => {
                  onAvatarSelect(avatar);
                  onOpenChange(false);
                }}
                className="group relative cursor-pointer aspect-square overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <Avatar className="h-full w-full">
                  <AvatarImage src={avatar} alt={`Avatar ${i + 1}`} />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute rounded-full inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
