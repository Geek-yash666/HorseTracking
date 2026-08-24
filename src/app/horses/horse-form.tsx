"use client";

import { useRef, useState } from "react";
import type { HorseModel } from "@/generated/prisma/models";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GENDERS,
  GENDER_LABELS,
  LIFECYCLES,
  LIFECYCLE_LABELS,
  SAMPLE_HORSE_PHOTOS,
} from "@/lib/horse-images";

/**
 * Client-side downscale so uploads stay small enough to store as data
 * URLs on the Horse row — no external blob storage needed for this
 * project's scope. Longest edge capped at 720px, JPEG q80.
 */
async function fileToResizedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 720;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}

export function HorseForm({
  action,
  horse,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  horse?: HorseModel;
  submitLabel: string;
}) {
  const [photoUrl, setPhotoUrl] = useState(horse?.photoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setPhotoUrl(dataUrl);
    } catch {
      alert("Couldn't read that image — try a JPG or PNG.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {/* Photo */}
      <div className="flex flex-col gap-2">
        <Label>Horse photo</Label>
        <div className="flex items-start gap-4">
          <div className="size-24 shrink-0 overflow-hidden rounded-xl border border-onstride-green/15 bg-muted">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL / local path preview
              <img
                src={photoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-onstride-green/30">
                <ImagePlus className="size-7" />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus data-icon="inline-start" />
                {uploading ? "Processing…" : "Upload photo"}
              </Button>
              {photoUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setPhotoUrl("")}
                >
                  <Trash2 data-icon="inline-start" /> Remove
                </Button>
              )}
            </div>

            {/* Sample picker for demo barns */}
            <div>
              <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-onstride-green/45">
                Or pick a sample
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_HORSE_PHOTOS.map((path) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() => setPhotoUrl(path)}
                    className={`size-11 overflow-hidden rounded-md border transition-all ${
                      photoUrl === path
                        ? "border-onstride-gold ring-2 ring-onstride-gold/40"
                        : "border-onstride-green/10 opacity-80 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- static sample asset */}
                    <img
                      src={path}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            <Input
              name="photoUrl"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="…or paste an image URL"
              className="h-8 text-xs"
            />
          </div>
        </div>
        <p className="text-xs text-onstride-green/50">
          Uploads are resized to 720px and stored with the horse&apos;s record.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={horse?.name}
            placeholder="e.g. Comet"
            required
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="breed">Breed</Label>
          <Input
            id="breed"
            name="breed"
            defaultValue={horse?.breed ?? ""}
            placeholder="e.g. Holsteiner"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="gender">Gender</Label>
          <Select name="gender" defaultValue={horse?.gender ?? ""}>
            <SelectTrigger id="gender" className="w-full">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g}>
                  {GENDER_LABELS[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ageYears">Age (years)</Label>
          <Input
            id="ageYears"
            name="ageYears"
            type="number"
            min={0}
            max={45}
            step={1}
            defaultValue={horse?.ageYears ?? ""}
            placeholder="e.g. 7"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="lifecycle">Status</Label>
          <Select name="lifecycle" defaultValue={horse?.lifecycle ?? "rotation"}>
            <SelectTrigger id="lifecycle" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIFECYCLES.map((l) => (
                <SelectItem key={l} value={l}>
                  {LIFECYCLE_LABELS[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-onstride-green/50">
            Only horses &ldquo;in rotation&rdquo; are scheduled onto the board.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={horse?.notes ?? ""}
          placeholder="e.g. head-shy, needs fly mask, on stall rest"
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
