import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Mac: tokens passed via KAKI_TOKEN / KAKI_REFRESH env vars. Safe to serve publicly.
const MAC_SCRIPT = `#!/bin/bash
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
curl -sfL "https://kakisewa.com/api/wa-blast/blaster" -o blaster.mjs

if [ ! -d node_modules ]; then
  echo "Installing packages (first time only, ~1 min)..."
  npm install @whiskeysockets/baileys qrcode-terminal qrcode @supabase/supabase-js --silent
fi

echo ""
exec node blaster.mjs
`;

// Windows PowerShell: tokens passed via $env:KAKI_TOKEN / $env:KAKI_REFRESH.
// Run with: $env:KAKI_TOKEN="..."; $env:KAKI_REFRESH="..."; irm kakisewa.com/api/wa-blast/run?platform=win | iex
const WIN_SCRIPT = `
if (-not $env:KAKI_TOKEN) {
  Write-Error "Missing token. Copy the full command from kakisewa.com."; exit 1
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
    Write-Host "Could not install Node.js automatically. Please visit https://nodejs.org"
    exit 1
  }
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
  Write-Host "Node.js installed!"
  Write-Host ""
}

$dir = "$env:USERPROFILE\\.kakisewa"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
Set-Location $dir

Write-Host "Downloading latest blaster..."
Invoke-WebRequest "https://kakisewa.com/api/wa-blast/blaster" -OutFile blaster.mjs

if (-not (Test-Path node_modules)) {
  Write-Host "Installing packages (first time only, ~1 min)..."
  npm install @whiskeysockets/baileys qrcode-terminal qrcode @supabase/supabase-js --silent
}

Write-Host ""
node blaster.mjs
`;

export async function GET(req: Request) {
  const platform = new URL(req.url).searchParams.get("platform") ?? "mac";

  if (platform === "win") {
    return new NextResponse(WIN_SCRIPT, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return new NextResponse(MAC_SCRIPT, {
    headers: {
      "Content-Type": "text/x-sh; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
