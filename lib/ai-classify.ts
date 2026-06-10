import OpenAI from "openai";

// ─── Owner intake classification ──────────────────────────────────────────────

export interface OwnerIntakeData {
  unit?: string;
  bedrooms?: number;
  bathrooms?: number;
  expected_rent?: number;
  available_from?: string;
  tenant_preferences?: string;
}

// New question order: [0]=address, [1]=bedrooms, [2]=bathrooms, [3]=expected_rent, [4]=available_from, [5]=tenant_preferences
export async function classifyOwnerIntake(rawAnswers: string[]): Promise<OwnerIntakeData> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return mockOwnerIntake(rawAnswers);

  const openai = new OpenAI({ apiKey });
  const prompt = `You are a Malaysian property management assistant. Extract structured data from these owner intake answers.

Answers (in order):
1. Property unit number: ${rawAnswers[0] ?? ""}
2. Bedrooms: ${rawAnswers[1] ?? ""}
3. Bathrooms: ${rawAnswers[2] ?? ""}
4. Expected monthly rent (RM): ${rawAnswers[3] ?? ""}
5. Move-in date (YYYY-MM-DD): ${rawAnswers[4] ?? ""}
6. Tenant preferences: ${rawAnswers[5] ?? ""}

Return ONLY valid JSON:
{
  "unit": string or null,
  "bedrooms": integer or null (Studio = 0, "5+" = 5),
  "bathrooms": integer or null ("4+" = 4),
  "expected_rent": number or null (RM, digits only),
  "available_from": "YYYY-MM-DD" or null,
  "tenant_preferences": string or null
}`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });
    return JSON.parse(res.choices[0]?.message?.content ?? "{}") as OwnerIntakeData;
  } catch {
    return mockOwnerIntake(rawAnswers);
  }
}

function parseBeds(raw: string): number | undefined {
  const s = raw.trim().toLowerCase();
  if (s === "studio") return 0;
  const n = parseInt(s.replace(/[^\d]/g, ""));
  return isNaN(n) ? undefined : n;
}

function parseBaths(raw: string): number | undefined {
  const n = parseInt(raw.trim().replace(/[^\d]/g, ""));
  return isNaN(n) ? undefined : n;
}

function mockOwnerIntake(answers: string[]): OwnerIntakeData {
  // [0]=unit, [1]=bedrooms, [2]=bathrooms, [3]=rent, [4]=available_from, [5]=preferences
  const rentRaw = answers[3] ?? "";
  const dateRaw = answers[4] ?? "";
  const rentNum = parseFloat(rentRaw.replace(/[^\d.]/g, ""));
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : undefined;
  return {
    unit: answers[0] || undefined,
    bedrooms: parseBeds(answers[1] ?? ""),
    bathrooms: parseBaths(answers[2] ?? ""),
    expected_rent: isNaN(rentNum) ? undefined : rentNum,
    available_from: dateValid,
    tenant_preferences: answers[5] || undefined,
  };
}

// ─── Tenant intake extraction ──────────────────────────────────────────────────

export interface TenantIntakeData {
  name: string;
  age?: number;
  occupation?: string;
  monthly_income?: number;
  occupants?: number;
  pets: number;
  smoking: number;
  budget_min?: number;
  budget_max?: number;
  bedrooms_pref?: number;
  preferred_move_in?: string;
  area_preference?: string;
  furnishing_preference?: string;
}

export async function extractTenantIntake(rawAnswers: string[]): Promise<TenantIntakeData> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return mockTenantIntake(rawAnswers);

  const openai = new OpenAI({ apiKey });
  const prompt = `You are a Malaysian property management assistant. Extract structured data from these tenant intake answers.

Answers (in order):
1. Name: ${rawAnswers[0] ?? ""}
2. Age: ${rawAnswers[1] ?? ""}
3. Occupation: ${rawAnswers[2] ?? ""}
4. Monthly income (RM): ${rawAnswers[3] ?? ""}
5. Number of occupants: ${rawAnswers[4] ?? ""}
6. Has pets (yes/no): ${rawAnswers[5] ?? ""}
7. Smokes (yes/no): ${rawAnswers[6] ?? ""}
8. Budget range (RM): ${rawAnswers[7] ?? ""}
9. Bedrooms needed: ${rawAnswers[8] ?? ""}
10. Move-in date: ${rawAnswers[9] ?? ""}
11. Preferred areas/locations: ${rawAnswers[10] ?? ""}
12. Furnishing preference: ${rawAnswers[11] ?? ""}

Return ONLY valid JSON:
{
  "name": string,
  "age": integer or null,
  "occupation": string or null,
  "monthly_income": number or null,
  "occupants": integer or null,
  "pets": 0 or 1,
  "smoking": 0 or 1,
  "budget_min": number or null,
  "budget_max": number or null,
  "bedrooms_pref": integer or null,
  "preferred_move_in": "YYYY-MM-DD" or null,
  "area_preference": string or null,
  "furnishing_preference": "Fully furnished" | "Semi-furnished" | "Unfurnished" | "Flexible" or null
}`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    return JSON.parse(res.choices[0]?.message?.content ?? "{}") as TenantIntakeData;
  } catch {
    return mockTenantIntake(rawAnswers);
  }
}

function mockTenantIntake(answers: string[]): TenantIntakeData {
  const petsRaw = (answers[5] ?? "").toLowerCase();
  const smokingRaw = (answers[6] ?? "").toLowerCase();
  const budgetRaw = answers[7] ?? "";
  const nums = budgetRaw.match(/[\d,]+/g)?.map((n) => parseFloat(n.replace(/,/g, ""))) ?? [];
  const incomeNum = parseFloat((answers[3] ?? "").replace(/[^\d.]/g, ""));
  const ageNum = parseInt(answers[1] ?? "");
  const bedNum = parseInt(answers[8] ?? "");
  const occNum = parseInt(answers[4] ?? "");
  return {
    name: answers[0] ?? "Unknown",
    age: isNaN(ageNum) ? undefined : ageNum,
    occupation: answers[2] || undefined,
    monthly_income: isNaN(incomeNum) ? undefined : incomeNum,
    occupants: isNaN(occNum) ? undefined : occNum,
    pets: petsRaw.includes("yes") ? 1 : 0,
    smoking: smokingRaw.includes("yes") ? 1 : 0,
    budget_min: nums[0] ?? undefined,
    budget_max: nums[1] ?? nums[0] ?? undefined,
    bedrooms_pref: isNaN(bedNum) ? undefined : bedNum,
    preferred_move_in: undefined,
    area_preference: answers[10] || undefined,
    furnishing_preference: answers[11] || undefined,
  };
}

// ─── WhatsApp reply intent classification ─────────────────────────────────────
// Classifies a free-text WhatsApp reply as yes (wants to renew), no (doesn't),
// or unclear (needs human judgement). Handles Malay + English.

export async function classifyWaReply(
  messageText: string,
  context: "owner" | "tenant"
): Promise<"yes" | "no" | "unclear"> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return classifyWaReplyHeuristic(messageText);

  const openai = new OpenAI({ apiKey });
  const who = context === "owner" ? "property owner" : "tenant";
  const prompt = `You are helping a Malaysian property agent track rental renewal intent.
A ${who} sent this WhatsApp reply: "${messageText}"

Does this reply indicate they WANT TO RENEW (yes), DO NOT WANT TO RENEW (no), or is it UNCLEAR?

Rules:
- "boleh", "ok", "setuju", "nak renew", "yes", "sure", "confirm" → yes
- "tak nak", "no", "tidak", "cancel", "stop", "move out", "vacate", "end" → no
- Questions, greetings, "fikir dulu", "later", emoji-only, unrelated topics → unclear

Return ONLY one word: yes, no, or unclear`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 5,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = (res.choices[0]?.message?.content ?? "").trim().toLowerCase();
    if (raw === "yes") return "yes";
    if (raw === "no") return "no";
    return "unclear";
  } catch {
    return classifyWaReplyHeuristic(messageText);
  }
}

function classifyWaReplyHeuristic(text: string): "yes" | "no" | "unclear" {
  const t = text.toLowerCase();
  const yesWords = ["boleh", "ok", "okay", "setuju", "nak renew", "yes", "sure", "confirm", "agree", "renew"];
  const noWords = ["tak nak", "tidak nak", "no", "tidak", "cancel", "stop", "move out", "vacate", "end", "keluar"];
  if (yesWords.some((w) => t.includes(w))) return "yes";
  if (noWords.some((w) => t.includes(w))) return "no";
  return "unclear";
}
