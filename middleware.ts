import { NextRequest, NextResponse } from "next/server";

const DEV_AGENT_ID = "dev_agent_howard";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  // In dev this is always the single agent. Swap getAgentId() → Clerk at deploy.
  requestHeaders.set("x-agent-id", DEV_AGENT_ID);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
