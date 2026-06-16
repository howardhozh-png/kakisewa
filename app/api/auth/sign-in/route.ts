import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { email, passcode } = await request.json();
  if (!email || !passcode) {
    return NextResponse.json({ ok: false, error: "Email and passcode are required." }, { status: 400 });
  }

  const cookieStore = await cookies();
  // Build the success response up front so Supabase's session cookies land in its
  // Set-Cookie header — Safari (ITP) requires this; a JS-only cookie write followed
  // by an immediate navigation can race and leave the browser without a session.
  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          response.cookies.set(name, value, options);
        }),
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password: passcode });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
  }

  return response;
}
