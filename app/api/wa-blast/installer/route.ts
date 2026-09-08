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

# Find or install Node.js — no password required
KAKI_NODE_HOME="$HOME/.kakisewa/node"
if [ -f "$KAKI_NODE_HOME/bin/node" ]; then
  export PATH="$KAKI_NODE_HOME/bin:$PATH"
elif command -v node &>/dev/null; then
  : # system node is fine
elif command -v brew &>/dev/null; then
  echo "Installing Node.js via Homebrew..."
  brew install node
  export PATH="$(brew --prefix)/bin:$PATH"
else
  echo "Downloading Node.js (no password needed)..."
  ARCH=$(uname -m)
  [ "$ARCH" = "arm64" ] && NARCH="arm64" || NARCH="x64"
  mkdir -p "$KAKI_NODE_HOME"
  curl -fsSL "https://nodejs.org/dist/v22.17.1/node-v22.17.1-darwin-\${NARCH}.tar.gz" \\
    | tar -xz -C "$KAKI_NODE_HOME" --strip-components=1
  export PATH="$KAKI_NODE_HOME/bin:$PATH"
fi

if ! command -v node &>/dev/null; then
  echo "Could not find or install Node.js. Visit https://nodejs.org and try again."
  exit 1
fi
echo "Node.js $(node --version) ready."
echo ""

mkdir -p "$HOME/.kakisewa" && cd "$HOME/.kakisewa"
echo "Downloading latest blaster..."
curl -sfL "${BLASTER_URL}" -o blaster.mjs
FIRST=$(head -c 1 blaster.mjs 2>/dev/null)
if [ ! -s blaster.mjs ] || [ "$FIRST" = "<" ] || [ "$FIRST" = "{" ]; then
  echo "Download failed. Check your connection and try again."
  exit 1
fi

if [ ! -d node_modules ] || [ ! -d node_modules/ws ]; then
  echo "Installing packages (first time only, ~1 min)..."
  npm install @whiskeysockets/baileys qrcode-terminal qrcode @supabase/supabase-js ws --silent
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

set "KAKI_NODE=%USERPROFILE%\\.kakisewa\\node"

where node >nul 2>&1
if %errorlevel% equ 0 goto node_ready

if exist "%KAKI_NODE%\\node.exe" (
    set "PATH=%KAKI_NODE%;%PATH%"
    goto node_ready
)

echo Node.js not found. Downloading (no admin rights needed)...
if not exist "%USERPROFILE%\\.kakisewa" mkdir "%USERPROFILE%\\.kakisewa"
powershell -NoProfile -Command "& { $url='https://nodejs.org/dist/v22.17.1/node-v22.17.1-win-x64.zip'; $zip=$env:TEMP+'\\node.zip'; Invoke-WebRequest $url -OutFile $zip; Expand-Archive $zip -DestinationPath ($env:USERPROFILE+'\\.kakisewa') -Force; if (Test-Path ($env:USERPROFILE+'\\.kakisewa\\node-v22.17.1-win-x64')) { Rename-Item ($env:USERPROFILE+'\\.kakisewa\\node-v22.17.1-win-x64') 'node' }; Remove-Item $zip -ErrorAction SilentlyContinue }"
set "PATH=%KAKI_NODE%;%PATH%"
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Could not install Node.js. Visit https://nodejs.org and install it manually.
    pause
    exit /b 1
)
echo Node.js installed!

:node_ready
echo Node.js ready.
echo.

if not exist "%USERPROFILE%\\.kakisewa" mkdir "%USERPROFILE%\\.kakisewa"
cd /d "%USERPROFILE%\\.kakisewa"

echo Downloading latest blaster...
curl -sfL "${BLASTER_URL}" -o blaster.mjs
if not exist blaster.mjs (
    echo Download failed. Check your connection and try again.
    pause
    exit /b 1
)

if not exist node_modules\\ws (
    echo Installing packages (first time only, ~1 min)...
    npm install @whiskeysockets/baileys qrcode-terminal qrcode @supabase/supabase-js ws --silent
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
