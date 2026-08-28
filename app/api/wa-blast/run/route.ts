import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Generic Mac shell script — tokens are passed via KAKI_TOKEN / KAKI_REFRESH env vars.
// No tokens embedded here, safe to serve publicly.
const SCRIPT = `#!/bin/bash
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

export async function GET() {
  return new NextResponse(SCRIPT, {
    headers: {
      "Content-Type": "text/x-sh; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
