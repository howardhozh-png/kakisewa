// Fetches DM Serif Display Regular from Google Fonts for use in Satori/ImageResponse.
// Called at request time; Next.js edge/node caching keeps this fast after the first hit.
export async function loadDmSerifFont(): Promise<ArrayBuffer> {
  const css = await fetch(
    "https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    }
  ).then((r) => r.text());

  const url = css.match(
    /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/
  )?.[1];
  if (!url) throw new Error("DM Serif Display font URL not found in Google Fonts CSS");
  return fetch(url).then((r) => r.arrayBuffer());
}
