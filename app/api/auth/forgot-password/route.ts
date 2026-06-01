import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { email } = await req.json() as { email: string }
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: "https://www.kakisewa.com/reset-password",
    },
  })

  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ error: error?.message ?? "Could not generate reset link" }, { status: 400 })
  }

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "kakisewa <noreply@kakisewa.com>",
      to: [email],
      subject: "Reset your password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <p style="font-size:22px;font-weight:700;letter-spacing:-0.02em;margin:0 0 24px">kakisewa</p>
          <h1 style="font-size:18px;font-weight:600;margin:0 0 8px">Reset your password</h1>
          <p style="font-size:14px;color:#6C6C70;margin:0 0 24px">
            We received a request to reset your password. Click the button below to choose a new one.
            This link expires in 1 hour.
          </p>
          <a href="${data.properties.action_link}"
            style="display:inline-block;background:#1C1C1E;color:#fff;font-size:14px;font-weight:600;
                   padding:12px 24px;border-radius:10px;text-decoration:none">
            Reset password
          </a>
          <p style="font-size:12px;color:#AEAEB2;margin:24px 0 0">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    }),
  })

  if (!resendRes.ok) {
    const err = await resendRes.json().catch(() => ({}))
    console.error("Resend error:", err)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
