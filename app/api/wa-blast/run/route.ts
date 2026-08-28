import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function macScript(origin: string): string {
  return `#!/bin/bash
if [ -z "$KAKI_TOKEN" ]; then
  echo "Error: missing token. Copy the full command from kakisewa.com."
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  kakisewa WA Blaster"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! command -v node &>/dev/null; then
  echo "Node.js not found. Installing automatically..."
  if command -v brew &>/dev/null; then
    brew install node
    export PATH="$(brew --prefix)/bin:$PATH"
  else
    NTMP=$(mktemp -d)
    echo "Downloading Node.js installer (~30s)..."
    curl -fsSL "https://nodejs.org/dist/v20.18.0/node-v20.18.0.pkg" -o "$NTMP/node.pkg"
    echo "Installing Node.js. Your Mac may ask for your password."
    sudo installer -pkg "$NTMP/node.pkg" -target /
    rm -rf "$NTMP"
    export PATH="/usr/local/bin:$PATH"
  fi
  if ! command -v node &>/dev/null; then
    echo ""
    echo "Could not install Node.js automatically."
    echo "Please install it from https://nodejs.org and run this command again."
    exit 1
  fi
  echo ""
fi

echo "Node.js $(node --version) ready."
echo ""

mkdir -p "$HOME/.kakisewa" && cd "$HOME/.kakisewa"
echo "Downloading latest blaster..."
curl -fsSL "${origin}/api/wa-blast/blaster" -o blaster.mjs
FIRST=$(head -c 1 blaster.mjs 2>/dev/null)
if [ ! -s blaster.mjs ] || [ "$FIRST" = "<" ] || [ "$FIRST" = "{" ]; then
  echo "Download failed. Check your connection and try again."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing packages (first time only, ~1 min)..."
  npm install @whiskeysockets/baileys qrcode-terminal qrcode @supabase/supabase-js --silent
fi

echo ""
exec node blaster.mjs
`;
}

function winScript(origin: string): string {
  return `
if (-not $env:KAKI_TOKEN) {
  Write-Host "Error: missing token. Copy the full command from kakisewa.com."
  exit 1
}
Write-Host ""
Write-Host "================================================"
Write-Host "  kakisewa WA Blaster"
Write-Host "================================================"
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js not found. Installing automatically..."
  winget install OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Could not install Node.js automatically. Please visit https://nodejs.org and install it, then run this command again."
    exit 1
  }
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js installed. Please close this window, reopen PowerShell, and run the command again."
    exit 0
  }
  Write-Host "Node.js installed!"
  Write-Host ""
}

Write-Host "Node.js $(node --version) ready."
Write-Host ""

$dir = "$env:USERPROFILE\.kakisewa"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
Set-Location $dir

Write-Host "Downloading latest blaster..."
try {
  Invoke-WebRequest "${origin}/api/wa-blast/blaster" -OutFile blaster.mjs -ErrorAction Stop
} catch {
  Write-Host "Download failed: $_"
  Write-Host "Check your connection and try again."
  exit 1
}
$firstChar = (Get-Content blaster.mjs -Raw -ErrorAction SilentlyContinue)
if (-not $firstChar -or $firstChar[0] -eq '<' -or $firstChar[0] -eq '{') {
  Write-Host "Download failed (server error). Try again."
  exit 1
}

if (-not (Test-Path node_modules)) {
  Write-Host "Installing packages (first time only, ~1 min)..."
  npm install @whiskeysockets/baileys qrcode-terminal qrcode @supabase/supabase-js --silent
}

Write-Host ""
node blaster.mjs
`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const platform = url.searchParams.get("platform") ?? "mac";

  if (platform === "win") {
    return new NextResponse(winScript(origin), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return new NextResponse(macScript(origin), {
    headers: {
      "Content-Type": "text/x-sh; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
