import OpenAI from "openai";
import { VerificationResult } from "./types";

const RECEIPT_PROMPT = `You are a Malaysian bank transfer / payment receipt verifier.
Analyse the receipt image and return ONLY a valid JSON object with these exact keys:
{
  "success": boolean — true if this is a real, legible payment receipt,
  "confidence": integer 0-100 — how confident you are in the reading,
  "detected_amount": number or null — the transferred/paid amount in RM,
  "detected_date": "YYYY-MM-DD" or null — transaction date,
  "detected_bank": string or null — bank or e-wallet name (Maybank, CIMB, RHB, Touch 'n Go, etc.),
  "notes": string — brief summary of findings or reason for failure
}
Return ONLY the JSON, no markdown fences.`;

export async function verifyReceiptImage(
  imageUrl: string,
  expectedAmount: number
): Promise<VerificationResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  // ── No key → deterministic mock (useful in dev without billing) ──────────────
  if (!apiKey) {
    return mockVerify(imageUrl, expectedAmount);
  }

  // ── Real GPT-4o Vision ────────────────────────────────────────────────────────
  const openai = new OpenAI({ apiKey });

  // For local /uploads/ paths we need an absolute URL
  const resolvedUrl = imageUrl.startsWith("/")
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"}${imageUrl}`
    : imageUrl;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: RECEIPT_PROMPT },
            {
              type: "image_url",
              image_url: { url: resolvedUrl, detail: "high" },
            },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as VerificationResult;
    return parsed;
  } catch (err) {
    console.error("[ai-verify] OpenAI error:", err);
    // Graceful degradation — don't crash the whole action
    return {
      success: false,
      confidence: 0,
      notes: "AI verification service unavailable. Please review manually.",
    };
  }
}

// ─── Deterministic mock (no API key required) ─────────────────────────────────
function mockVerify(imageUrl: string, expectedAmount: number): VerificationResult {
  const seed = imageUrl.length % 3;

  if (seed === 0) {
    return {
      success: true,
      confidence: 94,
      detected_amount: expectedAmount,
      detected_date: new Date().toISOString().split("T")[0],
      detected_bank: "Maybank",
      notes: `[Mock] Amount RM${expectedAmount.toFixed(2)} matches. Verified via Maybank transfer.`,
    };
  }
  if (seed === 1) {
    return {
      success: true,
      confidence: 71,
      detected_amount: expectedAmount - 50,
      detected_date: new Date().toISOString().split("T")[0],
      detected_bank: "CIMB",
      notes: `[Mock] Detected RM${(expectedAmount - 50).toFixed(2)} — RM50 short. Verify with tenant.`,
    };
  }
  return {
    success: false,
    confidence: 22,
    notes: "[Mock] Image unclear or not a valid receipt. Request a clearer photo.",
  };
}
