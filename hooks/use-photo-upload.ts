"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { saveOwnerLeadPhotos, updateOwnerLeadDetails } from "@/lib/actions";

export function usePhotoUpload(
  leadId: string,
  initialPhotos: string[],
  initialCoverIndex: number,
  onSaved?: (updates: { photo_urls?: string[]; cover_photo_index?: number }) => void
) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [coverIndex, setCoverIndex] = useState<number>(initialCoverIndex);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset(newPhotos: string[], newCover: number) {
    setPhotos(newPhotos);
    setCoverIndex(newCover);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const room = 10 - photos.length;
    if (room <= 0) { toast.error("Maximum 10 photos reached"); return; }

    const batch = files.slice(0, Math.min(5, room));
    if (files.length > batch.length) {
      toast.error(
        room < files.length && room <= 5
          ? `Only ${room} more photo${room === 1 ? "" : "s"} can be added (max 10)`
          : "You can upload up to 5 photos at a time. Select more after this batch finishes."
      );
    }

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of batch) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload/document", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error ?? `Upload failed for ${file.name}`); continue; }
        uploaded.push(data.url as string);
      }
      if (uploaded.length === 0) return;
      const next = [...photos, ...uploaded];
      setPhotos(next);
      await saveOwnerLeadPhotos(leadId, next);
      onSaved?.({ photo_urls: next });
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(idx: number) {
    const next = photos.filter((_, i) => i !== idx);
    const newCover = idx === coverIndex ? 0 : idx < coverIndex ? coverIndex - 1 : coverIndex;
    setPhotos(next);
    setCoverIndex(newCover);
    await saveOwnerLeadPhotos(leadId, next);
    await updateOwnerLeadDetails(leadId, { cover_photo_index: newCover });
    onSaved?.({ photo_urls: next, cover_photo_index: newCover });
  }

  async function handleSetCover(idx: number) {
    setCoverIndex(idx);
    await updateOwnerLeadDetails(leadId, { cover_photo_index: idx });
    onSaved?.({ cover_photo_index: idx });
    toast.success("Cover photo updated");
  }

  return { photos, coverIndex, uploading, inputRef, reset, handleUpload, handleRemove, handleSetCover };
}
