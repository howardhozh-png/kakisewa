import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  const addDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  // Check if demo data already exists
  const { data: existing } = await supabase
    .from("owner_leads")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_demo", true)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "Demo data already exists" }, { status: 409 });
  }

  const ownerLeads = [
    // Property Leads (stage: imported/replied/wants_rent)
    {
      id: randomUUID(),
      user_id: user.id,
      owner_name: "Tan Chee Keong",
      owner_phone: "60123456789",
      property_name: "Residensi Damansara",
      unit: "B-12-3",
      bedrooms: 3,
      bathrooms: 2,
      expected_rent: 2800,
      stage: "imported",
      source: "manual",
      is_competitor_target: false,
      is_demo: true,
    },
    {
      id: randomUUID(),
      user_id: user.id,
      owner_name: "Lim Siew Ling",
      owner_phone: "60198765432",
      property_name: "Jalan Gombak",
      unit: "Level 5",
      bedrooms: 2,
      bathrooms: 1,
      expected_rent: 1600,
      stage: "replied",
      wa_status: "replied",
      source: "manual",
      is_competitor_target: false,
      is_demo: true,
    },
    {
      id: randomUUID(),
      user_id: user.id,
      owner_name: "Ahmad Faizal",
      owner_phone: "60111234567",
      property_name: "The Arc Ampang",
      unit: "A-3-8",
      bedrooms: 3,
      bathrooms: 2,
      expected_rent: 3200,
      stage: "wants_rent",
      wa_status: "replied",
      source: "manual",
      is_competitor_target: false,
      is_demo: true,
    },
    // My Listing (stage: listed)
    {
      id: randomUUID(),
      user_id: user.id,
      owner_name: "Priya Nair",
      owner_phone: "60167654321",
      property_name: "Suriamas Condominium",
      unit: "D-10-2",
      bedrooms: 2,
      bathrooms: 2,
      expected_rent: 1900,
      stage: "listed",
      source: "manual",
      is_competitor_target: false,
      is_demo: true,
    },
    // Lost Listing (is_competitor_target: true)
    {
      id: randomUUID(),
      user_id: user.id,
      owner_name: "Ravi Kumar",
      owner_phone: "60175551234",
      property_name: "Setia Alam Residences",
      unit: "G-2-15",
      bedrooms: 4,
      bathrooms: 3,
      expected_rent: 3800,
      stage: "imported",
      is_competitor_target: true,
      competitor_stage: "watching",
      competitor_contract_end: addDays(150),
      source: "manual",
      is_demo: true,
    },
    {
      id: randomUUID(),
      user_id: user.id,
      owner_name: "Nurul Huda",
      owner_phone: "60142223344",
      property_name: "Taman Desa Damai",
      unit: "A-4-5",
      bedrooms: 3,
      bathrooms: 2,
      expected_rent: 2400,
      stage: "imported",
      is_competitor_target: true,
      competitor_stage: "reach_out",
      competitor_contract_end: addDays(42),
      source: "manual",
      is_demo: true,
    },
  ];

  const { error: leadsError } = await supabase.from("owner_leads").insert(ownerLeads);
  if (leadsError) {
    console.error("Demo seed leads error:", leadsError);
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  const tenancies = [
    {
      id: randomUUID(),
      user_id: user.id,
      tenant_name: "David Wong",
      tenant_phone: "60123337788",
      property_name: "Bukit Jalil Park Residences",
      due_day: 5,
      amount: 2200,
      current_month_paid: false,
      lhdn_status: "none",
      status: "Pending",
      replied_tenant: "pending",
      replied_owner: "pending",
      lifecycle_stage: "active",
      contract_start: addDays(-180),
      contract_end: addDays(240),
      is_demo: true,
    },
    {
      id: randomUUID(),
      user_id: user.id,
      tenant_name: "Nurul Ain Zainudin",
      tenant_phone: "60198887766",
      property_name: "Sri Rampai Apartment",
      due_day: 1,
      amount: 1800,
      current_month_paid: false,
      lhdn_status: "none",
      status: "Pending",
      replied_tenant: "pending",
      replied_owner: "pending",
      lifecycle_stage: "headsup",
      contract_start: addDays(-305),
      contract_end: addDays(50),
      is_demo: true,
    },
    {
      id: randomUUID(),
      user_id: user.id,
      tenant_name: "Chen Wei Liang",
      tenant_phone: "60126665544",
      property_name: "Mont Kiara Palma",
      due_day: 10,
      amount: 2500,
      current_month_paid: false,
      lhdn_status: "none",
      status: "Pending",
      replied_tenant: "yes",
      replied_owner: "pending",
      lifecycle_stage: "pinged",
      contract_start: addDays(-335),
      contract_end: addDays(28),
      is_demo: true,
    },
    {
      id: randomUUID(),
      user_id: user.id,
      tenant_name: "Siti Rahmah Bt Razak",
      tenant_phone: "60134442211",
      property_name: "Pandan Perdana Flat",
      due_day: 15,
      amount: 1600,
      current_month_paid: false,
      lhdn_status: "none",
      status: "Pending",
      replied_tenant: "yes",
      replied_owner: "yes",
      lifecycle_stage: "renewing",
      contract_start: addDays(-348),
      contract_end: addDays(15),
      is_demo: true,
    },
  ];

  const { error: tenanciesError } = await supabase.from("tenancies").insert(tenancies);
  if (tenanciesError) {
    console.error("Demo seed tenancies error:", tenanciesError);
    return NextResponse.json({ error: tenanciesError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
