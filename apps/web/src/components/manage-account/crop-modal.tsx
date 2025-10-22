"use client";

import { useCallback, useState } from "react";
import { Dialog, DialogContent, DialogHeader } from "../ui/dialog";
import { getCroppedImg } from "./utils";
import Cropper from "react-easy-crop";
import { Slider } from "../ui/slider";
import { Button } from "../ui/button";

interface CropModalProps {
  imageSrc: string;
  open: boolean;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

export function CropModal({
  imageSrc,
  open,
  onClose,
  onCropComplete,
}: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropCompleteInternal = useCallback(
    (_croppedArea: any, croppedPixels: any) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  const createCroppedImage = useCallback(async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
    if (croppedImage) onCropComplete(croppedImage);
    onClose();
  }, [croppedAreaPixels, imageSrc, onClose, onCropComplete]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-4">
        <DialogHeader>Crop your profile picture</DialogHeader>
        <div className="relative w-full h-64 bg-muted overflow-hidden rounded-lg">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteInternal}
          />
        </div>

        <div className="mt-4 flex gap-3">
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={(v) => setZoom(v[0])}
          />

          <p>{Math.floor(((zoom - 1) / (3 - 1)) * 100)}%</p>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={createCroppedImage}>Crop & Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
