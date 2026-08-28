import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BLASTER_URL = "https://kakisewa.com/api/wa-blast/blaster";

function macScript(at: string, rt: string): string {
  return `#!/bin/bash
# kakisewa WA Blaster
# Keep this file private — it contains your personal login token.

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  kakisewa WA Blaster"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Install Node.js if missing
if ! command -v node &>/dev/null; then
  echo "Node.js not found. Installing automatically..."
  if command -v brew &>/dev/null; then
    brew install node
  else
    TMPDIR=$(mktemp -d)
    echo "Downloading Node.js installer (~30s)..."
    curl -fsSL "https://nodejs.org/dist/v20.18.0/node-v20.18.0.pkg" -o "$TMPDIR/node.pkg"
    echo "Installing. Your Mac may ask for your password."
    sudo installer -pkg "$TMPDIR/node.pkg" -target /
    rm -rf "$TMPDIR"
    export PATH="/usr/local/bin:/usr/bin:$PATH"
  fi
  echo ""
fi

mkdir -p "$HOME/.kakisewa" && cd "$HOME/.kakisewa"
echo "Downloading latest blaster..."
curl -sfL "${BLASTER_URL}" -o blaster.mjs

if [ ! -d node_modules ]; then
  echo "Installing packages (first time only, ~1 min)..."
  npm install @whiskeysockets/baileys qrcode-terminal qrcode @supabase/supabase-js --silent
fi

echo ""
KAKI_TOKEN="${at}" KAKI_REFRESH="${rt}" exec node blaster.mjs
`;
}

function winScript(at: string, rt: string): string {
  return `@echo off
title kakisewa WA Blaster
echo.
echo ================================================
echo   kakisewa WA Blaster
echo ================================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js not found. Installing automatically...
    winget install OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo.
        echo Could not install Node.js automatically.
        echo Please visit https://nodejs.org and install Node.js manually.
        echo Then close this window and double-click this file again.
        pause
        exit /b 1
    )
    echo.
    echo Node.js installed! Close this window and double-click this file again.
    pause
    exit /b 0
)

if not exist "%USERPROFILE%\\.kakisewa" mkdir "%USERPROFILE%\\.kakisewa"
cd /d "%USERPROFILE%\\.kakisewa"

echo Downloading latest blaster...
curl -sfL "${BLASTER_URL}" -o blaster.mjs

if not exist node_modules (
    echo Installing packages (first time only, ~1 min)...
    npm install @whiskeysockets/baileys qrcode-terminal qrcode @supabase/supabase-js --silent
)

echo.
set KAKI_TOKEN=${at}
set KAKI_REFRESH=${rt}
node blaster.mjs
pause
`;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const platform = new URL(req.url).searchParams.get("platform") ?? "mac";
  const { access_token: at, refresh_token: rt } = session;

  if (platform === "win") {
    return new NextResponse(winScript(at, rt), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="kakisewa-blaster.bat"',
        "Cache-Control": "no-store",
      },
    });
  }

  return new NextResponse(macScript(at, rt), {
    headers: {
      "Content-Type": "text/x-sh; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kakisewa-blaster.command"',
      "Cache-Control": "no-store",
    },
  });
}
