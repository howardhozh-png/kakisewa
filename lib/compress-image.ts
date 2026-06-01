/**
 * Resize + JPEG-compress an image file before upload.
 * iPhone 15 Pro: ~8 MB raw → ~400 KB after. ~10-20x faster upload.
 * Returns the original file unchanged for non-images or files already small.
 */
export async function compressImage(
  file: File,
  maxDim = 2048,
  quality = 0.82
): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 150_000) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width: w, height: h } = bitmap;

    let nw = w, nh = h;
    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      nw = Math.round(w * ratio);
      nh = Math.round(h * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = nw;
    canvas.height = nh;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, nw, nh);
    bitmap.close();

    return new Promise<File>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    });
  } catch {
    return file;
  }
}
