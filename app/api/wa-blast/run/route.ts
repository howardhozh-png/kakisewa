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
  curl -fsSL "https://nodejs.org/dist/v22.17.1/node-v22.17.1-darwin-\${NARCH}.tar.gz" \
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
curl -fsSL "${origin}/api/wa-blast/blaster" -o blaster.mjs
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
while true; do
  node blaster.mjs
  EC=$?
  if [ $EC -eq 2 ]; then
    echo ""
    echo "Relinked — showing new QR..."
    echo ""
    sleep 1
  else
    break
  fi
done
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

$kakinode = "$env:USERPROFILE\.kakisewa\node"
if (Get-Command node -ErrorAction SilentlyContinue) {
  # system node available
} elseif (Test-Path "$kakinode\node.exe") {
  $env:PATH = "$kakinode;$env:PATH"
} else {
  Write-Host "Downloading Node.js (no admin rights needed)..."
  $nodeZip = "$env:TEMP\node.zip"
  Invoke-WebRequest "https://nodejs.org/dist/v22.17.1/node-v22.17.1-win-x64.zip" -OutFile $nodeZip
  Expand-Archive $nodeZip -DestinationPath "$env:USERPROFILE\.kakisewa" -Force
  if (Test-Path "$env:USERPROFILE\.kakisewa\node-v22.17.1-win-x64") {
    Rename-Item "$env:USERPROFILE\.kakisewa\node-v22.17.1-win-x64" "node"
  }
  Remove-Item $nodeZip -ErrorAction SilentlyContinue
  $env:PATH = "$kakinode;$env:PATH"
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Could not install Node.js. Visit https://nodejs.org and install manually, then run again."
    exit 1
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

if (-not (Test-Path node_modules\ws)) {
  Write-Host "Installing packages (first time only, ~1 min)..."
  npm install @whiskeysockets/baileys qrcode-terminal qrcode @supabase/supabase-js ws --silent
}

Write-Host ""
while ($true) {
  node blaster.mjs
  if ($LASTEXITCODE -eq 2) {
    Write-Host ""
    Write-Host "Relinked -- showing new QR..."
    Write-Host ""
    Start-Sleep 1
  } else {
    break
  }
}
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
