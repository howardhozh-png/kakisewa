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
    const file = e.target.files?.[0];
    if (!file || photos.length >= 10) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/document", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Upload failed"); return; }
      const next = [...photos, data.url as string];
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
