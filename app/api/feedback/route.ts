import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const HOWARD_EMAIL = process.env.ADMIN_EMAIL ?? "howardhozh@gmail.com";

export async function POST(req: NextRequest) {
  const agentId    = req.headers.get("x-agent-id") ?? "";
  const agentName  = req.headers.get("x-agent-name") ?? "";
  const agentEmail = req.headers.get("x-agent-email") ?? "";

  if (!agentId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { category, message, pageUrl } = await req.json() as {
    category: string;
    message: string;
    pageUrl: string;
  };

  if (!category || !message?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("feedback").insert({
    agent_id:    agentId,
    agent_name:  agentName,
    agent_email: agentEmail,
    category,
    message:     message.trim(),
    page_url:    pageUrl,
  });

  if (error) {
    console.error("Feedback insert error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  // Email Howard immediately on bug reports
  if (category === "bug" && process.env.RESEND_API_KEY) {
    const subject = `[Bug] ${agentName || agentEmail} on ${pageUrl || "unknown page"}`;
    const html = `
      <p><strong>Category:</strong> Bug</p>
      <p><strong>Agent:</strong> ${agentName} (${agentEmail})</p>
      <p><strong>Page:</strong> ${pageUrl}</p>
      <hr>
      <p>${message.trim().replace(/\n/g, "<br>")}</p>
      <p style="margin-top:16px;font-size:12px;color:#888">
        <a href="https://www.kakisewa.com/admin">View all feedback →</a>
      </p>
    `;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "kakisewa <noreply@kakisewa.com>",
        to: [HOWARD_EMAIL],
        subject,
        html,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
