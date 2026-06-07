import type { AgentProfile } from "./types";

export interface MissingProfileField {
  key: "name" | "ren_number" | "agency";
  label: string;
}

export function getMissingWhatsAppFields(agent: AgentProfile): MissingProfileField[] {
  const missing: MissingProfileField[] = [];
  if (!agent.name?.trim()) missing.push({ key: "name", label: "Full name" });
  if (!agent.ren_number?.trim()) missing.push({ key: "ren_number", label: "REN number" });
  if (!agent.agency?.trim()) missing.push({ key: "agency", label: "Agency" });
  return missing;
}

export function isWhatsAppProfileComplete(agent: AgentProfile): boolean {
  return getMissingWhatsAppFields(agent).length === 0;
}
