import { readFileSync } from "fs";
import { join } from "path";

// Node.js runtime: read from bundled public file — no network call, works at build time.
export function loadDmSerifFontSync(): ArrayBuffer {
  const buf = readFileSync(join(process.cwd(), "public/fonts/dm-serif-display.woff2"));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

// Edge runtime: fetch from the app's own public URL.
export async function loadDmSerifFontEdge(origin: string): Promise<ArrayBuffer> {
  return fetch(`${origin}/fonts/dm-serif-display.woff2`).then((r) => r.arrayBuffer());
}
