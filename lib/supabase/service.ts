import { createClient } from "@supabase/supabase-js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null

// Returns untyped client — intentional: no generated Database types available.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createServiceClient(): any {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  }
  return _client
}
