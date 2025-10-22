import type { EmployeeRole, OrgRole } from "../../../../server/prisma/generated/enums";

export const base64ToFile = async (dataUrl: string): Promise<File> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const extension = blob.type.split("/")[1];
  const fileName = `avatar_${Date.now()}.${extension}`;
  return new File([blob], fileName, { type: blob.type });
};

export const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

   export async function getCroppedImg(
      imageSrc: string,
      pixelCrop: any
    ): Promise<Blob | null> {
      const image = await createImage(imageSrc);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
    
      const size = Math.min(pixelCrop.width, pixelCrop.height);
      canvas.width = size;
      canvas.height = size;
    
      ctx.drawImage(image, pixelCrop.x, pixelCrop.y, size, size, 0, 0, size, size);
    
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
      });
    }
    

   export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = url;
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
  });
}

export const roleColors: Record<OrgRole | EmployeeRole, string> = {
  ADMIN: "bg-primary/10 text-primary border-primary/20",
  OWNER: "bg-primary/10 text-primary border-primary/20",
  ANALYST: "bg-amber-100 text-amber-700 border-amber-200",
  LOCATION_ADMIN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  LOCATION_FRONT_DESK: "bg-sky-100 text-sky-700 border-sky-200",
  LOCATION_SPECIALIST: "bg-purple-100 text-purple-700 border-purple-200",
  ORGANIZATION_MANAGEMENT: "bg-rose-100 text-rose-700 border-rose-200"
};
