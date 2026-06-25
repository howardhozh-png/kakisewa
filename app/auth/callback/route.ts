import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (code) {
    const cookieStore = await cookies();
    // Build the success redirect up front so we can attach Supabase cookies
    // directly onto the response object — Safari (ITP) requires cookies to be
    // in the Set-Cookie header of the redirect response, not just the cookie store.
    const successRedirect = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) => toSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            successRedirect.cookies.set(name, value, options);
          }),
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return successRedirect;
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`);
}
