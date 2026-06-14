import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { FAQ_CONTEXT } from "@/lib/faq-content";

const SYSTEM_PROMPT = `You are a friendly support assistant for kakisewa, a Malaysian property agent management app.

Answer questions using ONLY the information in the FAQ below. Use simple, friendly language. Never use em dashes or en dashes.

Formatting rules:
- For how-to or step-by-step questions, use a numbered list with each step on its own line (1. ... 2. ... 3. ...)
- For simple factual questions, answer in 2-3 sentences
- Use **bold** to highlight key button names, page names, or important terms

Synonym guide (treat these as the same):
- "card" = "listing" = "unit" = "lead" = "property card"
- "delete" = "remove" = "trash" = "got rid of"
- "deleted card" = "recycle bin" = "deleted panel" = "where deleted cards go" — answer: they go to a 7-day recycle bin shown at the top of the relevant page
- "My listing" = "My pipeline" = "pipeline board"
- "Existing listing" = "existing contracts" = "tenancy tracker"
- "Target listing" = "target units" = "competitor tracking"

If the answer is not covered in the FAQ, respond with exactly:
"I don't have that information here. Please email us at support@kakisewa.com and we will help you out."

Do not make up features or steps that are not in the FAQ.

--- FAQ ---
${FAQ_CONTEXT}`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const { message, history = [] } = (await req.json()) as {
    message: string;
    history: ChatMessage[];
  };

  if (!message?.trim()) {
    return NextResponse.json({ reply: "Please ask a question." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply: "Live chat is not available right now. Browse the FAQ page for answers, or email support@kakisewa.com.",
    });
  }

  const client = new Anthropic({ apiKey });

  try {
    const messages = [
      ...history.slice(-6).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message.trim() },
    ];

    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 450,
      system: SYSTEM_PROMPT,
      messages,
    });

    const reply =
      res.content[0]?.type === "text"
        ? res.content[0].text.trim()
        : "I'm not sure about that. Please email support@kakisewa.com for help.";

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({
      reply: "Something went wrong. Please email support@kakisewa.com and we will get back to you.",
    });
  }
}
