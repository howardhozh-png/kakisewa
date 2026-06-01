/**
 * Upload FormData via XHR so we get real upload progress events.
 * fetch() has no progress API; XHR does.
 */
export function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(xhr.responseText) as Record<string, unknown>; } catch { /* ignore */ }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, data });
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Aborted")));
    xhr.send(formData);
  });
}
