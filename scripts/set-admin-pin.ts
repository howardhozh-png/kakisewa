import { createClient } from "@supabase/supabase-js"

const url   = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key   = process.env.SUPABASE_SERVICE_ROLE_KEY!
const email = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "howardhozh@gmail.com"
const newPin = process.argv[2]

if (!newPin) { console.error("Usage: tsx scripts/set-admin-pin.ts <8-digit-pin>"); process.exit(1) }
if (!/^\d{8}$/.test(newPin)) { console.error("Pin must be exactly 8 digits"); process.exit(1) }

async function run() {
  const admin = createClient(url, key, { auth: { persistSession: false } })

  const { data: { users }, error: listErr } = await admin.auth.admin.listUsers()
  if (listErr) { console.error("Failed to list users:", listErr.message); process.exit(1) }

  const user = users.find((u: { email?: string }) => u.email === email)
  if (!user) { console.error(`No user found with email ${email}`); process.exit(1) }

  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, { password: newPin })
  if (updateErr) { console.error("Failed to update password:", updateErr.message); process.exit(1) }

  console.log(`Passcode updated for ${email}`)
}

run()
