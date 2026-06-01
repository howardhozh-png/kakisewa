"use client";

import { IntakeChat, IntakeQuestion } from "@/components/intake-chat";

interface Props {
  token: string;
  ownerName: string;
  agentName: string;
  agentAgency: string;
  agentPhotoUrl: string | null;
}

export function OwnerIntakeClient({ token, ownerName, agentName, agentAgency, agentPhotoUrl }: Props) {
  const questions: IntakeQuestion[] = [
    {
      key: "unit",
      text: "What's the unit number of your property?",
      placeholder: "e.g. A-12, B-3-05, Unit 12",
    },
    {
      key: "bedrooms",
      text: "How many bedrooms does it have?",
      inputType: "choice",
      choices: ["Studio", "1", "2", "3", "4", "5+"],
    },
    {
      key: "bathrooms",
      text: "How many bathrooms?",
      inputType: "choice",
      choices: ["1", "2", "3", "4+"],
    },
    {
      key: "expected_rent",
      text: "What monthly rent are you hoping for?",
      inputType: "rent",
    },
    {
      key: "available_from",
      text: "When can the new tenant move in?",
      inputType: "date",
    },
    {
      key: "tenant_preferences",
      text: "Any specific requirements for tenants? (optional, e.g. no pets, non-smoker, working professional)",
      placeholder: "Leave blank if none",
      optional: true,
    },
    {
      key: "photos",
      text: "Last step — can you share a few photos of the unit? Helps tenants decide much faster.",
      inputType: "photo" as const,
      optional: true,
      uploadToken: token,
    },
  ];

  async function handleComplete(answers: Record<string, string>) {
    const answerArray = questions
      .filter((q) => q.inputType !== "photo")
      .map((q) => answers[q.key] ?? "");

    const photoUrls = answers.photos
      ? answers.photos.split(",").filter(Boolean)
      : [];

    const res = await fetch("/api/intake/owner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, answers: answerArray, photoUrls }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string };
    return data;
  }

  const initial = agentName.charAt(0).toUpperCase();

  return (
    <IntakeChat
      agentName={agentName}
      agentAgency={agentAgency}
      agentInitial={initial}
      agentPhotoUrl={agentPhotoUrl}
      greeting={`Hi ${ownerName}! I'm ${agentName} from ${agentAgency}. I have a few quality tenants interested. Just 30 seconds to fill this in and I'll handle the rest for you.`}
      questions={questions}
      onComplete={handleComplete}
      thankYouMessage={`Thank you, ${ownerName}! I've received your property details and will get back to you shortly with next steps. 🙏`}
    />
  );
}
