// Edge runtime: fetch the TTF from the app's own public URL (no fs/path allowed).
export async function loadDmSerifFontEdge(origin: string): Promise<ArrayBuffer> {
  return fetch(`${origin}/fonts/dm-serif-display.ttf`).then((r) => r.arrayBuffer());
}
