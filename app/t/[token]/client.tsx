"use client";

import { IntakeChat, IntakeQuestion } from "@/components/intake-chat";

interface Props {
  token: string;
  agentName: string;
  agentAgency: string;
  prefilledName?: string;
}

export function TenantIntakeClient({ token, agentName, agentAgency, prefilledName }: Props) {
  const questions: IntakeQuestion[] = [
    {
      key: "name",
      text: "First, what's your full name?",
      placeholder: "e.g. Ahmad Firdaus",
    },
    {
      key: "age",
      text: "How old are you?",
      inputType: "number",
      placeholder: "e.g. 28",
    },
    {
      key: "occupation",
      text: "What's your current occupation?",
      placeholder: "e.g. Software Engineer at Grab",
    },
    {
      key: "monthly_income",
      text: "What's your monthly income? (RM)",
      inputType: "number",
      placeholder: "e.g. 8000",
    },
    {
      key: "occupants",
      text: "How many people (including yourself) will be moving in?",
      inputType: "number",
      placeholder: "e.g. 2",
    },
    {
      key: "pets",
      text: "Do you have any pets?",
      inputType: "choice",
      choices: ["Yes", "No"],
    },
    {
      key: "smoking",
      text: "Do you smoke?",
      inputType: "choice",
      choices: ["Yes", "No"],
    },
    {
      key: "budget",
      text: "What's your monthly rental budget? (RM min – max)",
      placeholder: "e.g. 1500 – 2500",
    },
    {
      key: "bedrooms",
      text: "How many bedrooms do you need?",
      inputType: "number",
      placeholder: "e.g. 2",
    },
    {
      key: "move_in",
      text: "When are you looking to move in?",
      placeholder: "e.g. 1 July 2026 or ASAP",
    },
  ];

  async function handleComplete(answers: Record<string, string>) {
    const answerArray = questions.map((q) => answers[q.key] ?? "");
    const res = await fetch("/api/intake/tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, answers: answerArray }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string };
    return data;
  }

  const initial = agentName.charAt(0).toUpperCase();
  const greeting = prefilledName
    ? `Hi ${prefilledName}! I'm ${agentName} from ${agentAgency}. Thanks for your interest in the property. I'd like to get a few details so I can confirm it's a great fit for you. 🏠`
    : `Hi! I'm ${agentName} from ${agentAgency}. I'd love to help you find the perfect home in Malaysia. Let me ask you a few quick questions so I can match you with the right property. 🏠`;

  return (
    <IntakeChat
      agentName={agentName}
      agentAgency={agentAgency}
      agentInitial={initial}
      greeting={greeting}
      questions={questions}
      onComplete={handleComplete}
      thankYouMessage="Thank you! Your profile has been saved. I'll reach out with you to arrange a viewing soon. 🙏"
    />
  );
}
