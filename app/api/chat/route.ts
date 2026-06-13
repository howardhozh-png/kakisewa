import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { FAQ_CONTEXT } from "@/lib/faq-content";

const SYSTEM_PROMPT = `You are a friendly support assistant for kakisewa, a Malaysian property agent management app.

Answer questions using ONLY the information in the FAQ below. Keep answers concise (2-4 sentences max). Use simple, friendly language. Never use em dashes or en dashes.

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply: "Live chat is not available right now. Browse the FAQ page for answers, or email support@kakisewa.com.",
    });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: message.trim() },
      ],
    });
    const reply =
      res.choices[0]?.message?.content?.trim() ??
      "I'm not sure about that. Please email support@kakisewa.com for help.";
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({
      reply: "Something went wrong. Please email support@kakisewa.com and we will get back to you.",
    });
  }
}
