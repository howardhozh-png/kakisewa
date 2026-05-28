import { headers } from "next/headers";

export const DEV_AGENT_ID = "dev_agent_howard";

export async function getAgentId(): Promise<string> {
  const h = await headers();
  return h.get("x-agent-id") ?? DEV_AGENT_ID;
}
