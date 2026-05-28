import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = process.env.VERCEL
  ? "/tmp/kakisewa"
  : path.join(process.cwd(), ".data");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "kakisewa.db"));
db.pragma(`journal_mode = ${process.env.VERCEL ? "DELETE" : "WAL"}`);
db.pragma("foreign_keys = ON");

// ─── Schema (v2 — additive migrations via IF NOT EXISTS / ADD COLUMN) ────────

db.exec(`
  CREATE TABLE IF NOT EXISTS properties (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    address      TEXT NOT NULL,
    unit         TEXT,
    owner_name   TEXT NOT NULL,
    owner_phone  TEXT NOT NULL,
    photo_urls   TEXT NOT NULL DEFAULT '[]',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tenancies (
    id                        TEXT PRIMARY KEY,
    property_id               TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_name               TEXT NOT NULL,
    tenant_phone              TEXT NOT NULL,
    due_day                   INTEGER NOT NULL CHECK(due_day BETWEEN 1 AND 28),
    amount                    REAL NOT NULL,
    current_month_paid        INTEGER NOT NULL DEFAULT 0,
    current_month_receipt_url TEXT,
    last_paid_month           TEXT,
    last_receipt_url          TEXT,
    lhdn_status               TEXT NOT NULL DEFAULT 'none'
                                CHECK(lhdn_status IN ('none','generated','submitted')),
    status                    TEXT NOT NULL DEFAULT 'Pending'
                                CHECK(status IN ('Pending','Reminder Sent','Paid - Pending Verification','Verified')),
    created_at                TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS account (
    id       INTEGER PRIMARY KEY DEFAULT 1,
    tier     TEXT NOT NULL DEFAULT 'starter'
               CHECK(tier IN ('starter','pro','elite')),
    beta_end TEXT NOT NULL DEFAULT '2026-08-04T00:00:00Z'
  );

  CREATE TABLE IF NOT EXISTS rent_payments (
    id          TEXT PRIMARY KEY,
    tenancy_id  TEXT NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
    month       TEXT NOT NULL,            -- 'YYYY-MM'
    amount      REAL NOT NULL,
    paid_at     TEXT,                     -- ISO timestamp; null = unpaid
    receipt_url TEXT,
    status      TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending','paid','verified')),
    UNIQUE(tenancy_id, month)
  );
  CREATE INDEX IF NOT EXISTS idx_rent_payments_month ON rent_payments(month);

  -- Every outbound WhatsApp send is logged here, regardless of channel
  -- (wa.me deeplink, BSP API, etc). Lets us migrate to WhatsApp Business API
  -- later without changing call sites.
  CREATE TABLE IF NOT EXISTS whatsapp_log (
    id          TEXT PRIMARY KEY,
    related_id  TEXT,                     -- tenancy_id, owner_lead_id, etc
    related_type TEXT,                    -- 'tenancy' | 'owner_lead' | 'tenant_lead' | 'match_pack'
    template    TEXT NOT NULL,            -- 'reminder' | 'forward_owner' | 'expiry_check_tenant' | 'expiry_check_owner' | ...
    recipient_phone TEXT NOT NULL,
    recipient_name  TEXT,
    body        TEXT,                     -- final message body
    channel     TEXT NOT NULL DEFAULT 'wa_me'
                  CHECK(channel IN ('wa_me','bsp_api')),
    sent_at     TEXT NOT NULL DEFAULT (datetime('now')),
    -- BSP-only fields, populated when we move off wa.me
    bsp_message_id TEXT,
    bsp_status     TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_whatsapp_log_related ON whatsapp_log(related_type, related_id);
  CREATE INDEX IF NOT EXISTS idx_whatsapp_log_sent_at ON whatsapp_log(sent_at);

  -- Single-row agent profile, used by message templates for personalised sign-off
  CREATE TABLE IF NOT EXISTS agent_profile (
    id          INTEGER PRIMARY KEY DEFAULT 1,
    name        TEXT,
    phone       TEXT,
    agency      TEXT,
    photo_url   TEXT
  );

  -- Owner leads — pre-tenancy stage. Imported from CSV or auto-created when a
  -- contract reaches "Replacing tenant". When a tenant signs, this lead is
  -- closed and a real Property + Tenancy is created.
  CREATE TABLE IF NOT EXISTS owner_leads (
    id              TEXT PRIMARY KEY,
    owner_name      TEXT NOT NULL,
    owner_phone     TEXT NOT NULL,
    property_name   TEXT,            -- "Residensi Mutiara" (if known)
    unit            TEXT,            -- "A-12" (if known)
    address         TEXT,
    expected_rent   REAL,
    bedrooms        INTEGER,
    bathrooms       INTEGER,
    notes           TEXT,
    source          TEXT,            -- 'csv' | 'auto_replacing' | 'manual'
    import_batch_id TEXT,
    stage           TEXT NOT NULL DEFAULT 'imported',
                       -- 'imported' | 'replied' | 'wants_rent' | 'own_stay' | 'listed' | 'archived'
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_owner_leads_stage ON owner_leads(stage);
  CREATE INDEX IF NOT EXISTS idx_owner_leads_phone ON owner_leads(owner_phone);

  -- Tenant profiles for matching. Created by manual quick-add today;
  -- in future fed by the public intake form.
  CREATE TABLE IF NOT EXISTS tenant_profiles (
    id                 TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    phone              TEXT,
    age                INTEGER,
    occupation         TEXT,
    employer           TEXT,
    nationality        TEXT,
    monthly_income     REAL,
    preferred_move_in  TEXT,        -- 'YYYY-MM-DD'
    occupants          INTEGER,
    pets               INTEGER NOT NULL DEFAULT 0,    -- 0/1
    smoking            INTEGER NOT NULL DEFAULT 0,    -- 0/1
    budget_min         REAL,
    budget_max         REAL,
    bedrooms_pref      INTEGER,
    bathrooms_pref     INTEGER,
    notes              TEXT,
    source             TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'intake_form'
    created_at         TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_tenant_profiles_phone ON tenant_profiles(phone);

  -- A pack is a collection of tenant profiles attached to one owner lead,
  -- shareable via an unguessable token URL the owner opens.
  CREATE TABLE IF NOT EXISTS match_packs (
    id              TEXT PRIMARY KEY,
    owner_lead_id   TEXT REFERENCES owner_leads(id) ON DELETE CASCADE,
    share_token     TEXT NOT NULL UNIQUE,
    -- Snapshot of property at pack creation time (so owner sees consistent data)
    property_label  TEXT,
    property_rent   REAL,
    property_beds   INTEGER,
    property_baths  INTEGER,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_match_packs_token ON match_packs(share_token);
  CREATE INDEX IF NOT EXISTS idx_match_packs_owner ON match_packs(owner_lead_id);

  -- Many-to-many: which tenants are in which pack, plus owner's ranking
  CREATE TABLE IF NOT EXISTS match_pack_tenants (
    pack_id           TEXT NOT NULL REFERENCES match_packs(id) ON DELETE CASCADE,
    tenant_profile_id TEXT NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    position          INTEGER NOT NULL DEFAULT 0,    -- agent's order
    rank              INTEGER,                        -- owner-set rank; NULL = unranked
    liked             INTEGER NOT NULL DEFAULT 0,     -- 0/1, owner's "want viewing"
    PRIMARY KEY (pack_id, tenant_profile_id)
  );

  -- Pending tenant intake sessions — created when agent generates a form link.
  -- On completion, a tenant_profile row is created and linked here.
  CREATE TABLE IF NOT EXISTS tenant_intake_sessions (
    token             TEXT PRIMARY KEY,
    agent_id          TEXT NOT NULL DEFAULT 'dev_agent_howard',
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at      TEXT,
    tenant_profile_id TEXT REFERENCES tenant_profiles(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_tenant_intake_token ON tenant_intake_sessions(token);
`);

// Additive migrations — safe to re-run
const addIfMissing = (table: string, col: string, def: string) => {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`); } catch { /* already exists */ }
};
addIfMissing("properties", "photo_urls", "TEXT NOT NULL DEFAULT '[]'");
addIfMissing("properties", "track_rent", "INTEGER NOT NULL DEFAULT 0");  // 0/1 boolean — does owner pay agent to track rent
addIfMissing("tenancies",  "last_receipt_url", "TEXT");
addIfMissing("tenancies",  "lhdn_status", "TEXT NOT NULL DEFAULT 'none'");
addIfMissing("tenancies",  "forwarded_at", "TEXT");
addIfMissing("tenancies",  "contract_start", "TEXT");          // ISO date (YYYY-MM-DD)
addIfMissing("tenancies",  "contract_end", "TEXT");            // ISO date
addIfMissing("tenancies",  "contract_duration_months", "INTEGER");
addIfMissing("tenancies",  "lifecycle_stage", "TEXT");
  //   'headsup' | 'pinged' | 'renewing' | 'replacing' | 'ending' | 'closed' | NULL
addIfMissing("tenancies",  "replied_tenant", "TEXT NOT NULL DEFAULT 'pending'");
  //   'pending' | 'yes' | 'no'
addIfMissing("tenancies",  "replied_owner",  "TEXT NOT NULL DEFAULT 'pending'");
addIfMissing("tenancies",  "agreement_url",  "TEXT");
addIfMissing("owner_leads", "photo_urls",     "TEXT NOT NULL DEFAULT '[]'");
addIfMissing("owner_leads", "agreement_url",  "TEXT");
addIfMissing("owner_leads", "outreach_count", "INTEGER NOT NULL DEFAULT 0");
addIfMissing("agent_profile", "commission_pct",      "REAL NOT NULL DEFAULT 100");
addIfMissing("agent_profile", "monthly_goal_rm",     "REAL");
addIfMissing("agent_profile", "quarterly_goal_rm",   "REAL");

// v3 — multi-tenancy + intake forms
addIfMissing("properties",        "agent_id",               "TEXT NOT NULL DEFAULT 'dev_agent_howard'");
addIfMissing("tenancies",         "agent_id",               "TEXT NOT NULL DEFAULT 'dev_agent_howard'");
addIfMissing("tenancies",         "owner_lead_id",          "TEXT");
addIfMissing("tenancies",         "report_token",           "TEXT");
addIfMissing("account",           "agent_id",               "TEXT NOT NULL DEFAULT 'dev_agent_howard'");
addIfMissing("account",           "subscription_status",    "TEXT NOT NULL DEFAULT 'active'");
addIfMissing("rent_payments",     "agent_id",               "TEXT NOT NULL DEFAULT 'dev_agent_howard'");
addIfMissing("whatsapp_log",      "agent_id",               "TEXT NOT NULL DEFAULT 'dev_agent_howard'");
addIfMissing("agent_profile",     "agent_id",               "TEXT NOT NULL DEFAULT 'dev_agent_howard'");
addIfMissing("owner_leads",       "agent_id",               "TEXT NOT NULL DEFAULT 'dev_agent_howard'");
addIfMissing("owner_leads",       "intake_token",           "TEXT");
addIfMissing("owner_leads",       "intake_sent_at",         "TEXT");
addIfMissing("owner_leads",       "intake_completed_at",    "TEXT");
addIfMissing("owner_leads",       "available_from",         "TEXT");
addIfMissing("owner_leads",       "tenant_preferences",     "TEXT");
addIfMissing("tenant_profiles",   "agent_id",               "TEXT NOT NULL DEFAULT 'dev_agent_howard'");
addIfMissing("tenant_profiles",   "intake_token",           "TEXT");
addIfMissing("tenant_profiles",   "intake_completed_at",    "TEXT");
addIfMissing("tenant_profiles",   "available_from",         "TEXT");
addIfMissing("match_packs",           "agent_id",        "TEXT NOT NULL DEFAULT 'dev_agent_howard'");
addIfMissing("match_pack_tenants",    "agent_id",        "TEXT NOT NULL DEFAULT 'dev_agent_howard'");
addIfMissing("tenant_intake_sessions","name",             "TEXT");
addIfMissing("tenant_intake_sessions","phone",            "TEXT");
addIfMissing("tenant_intake_sessions","owner_lead_id",    "TEXT");

// v4 — per-deal commission fields
addIfMissing("owner_leads", "is_renewal",            "INTEGER NOT NULL DEFAULT 0");
addIfMissing("owner_leads", "commission_override_rm", "REAL");

// v5 — agent personalisation
addIfMissing("agent_profile", "accent_color", "TEXT");

// v6 — today's focus sticky
addIfMissing("agent_profile", "today_focus",            "TEXT");
addIfMissing("agent_profile", "today_focus_updated_at", "TEXT");

// v7 — login streak
addIfMissing("agent_profile", "login_streak",    "INTEGER NOT NULL DEFAULT 0");
addIfMissing("agent_profile", "longest_streak",  "INTEGER NOT NULL DEFAULT 0");
addIfMissing("agent_profile", "last_login_date", "TEXT");

// v7b — today's checklist (JSON array of {id, text, done})
addIfMissing("agent_profile", "today_checklist", "TEXT");

// v8 — commission events (source of truth for income across months)
db.exec(`
  CREATE TABLE IF NOT EXISTS commission_events (
    id            TEXT PRIMARY KEY,
    agent_id      TEXT NOT NULL DEFAULT 'dev_agent_howard',
    tenancy_id    TEXT,
    owner_lead_id TEXT,
    type          TEXT NOT NULL CHECK(type IN ('new_signing','renewal')),
    amount        REAL NOT NULL,
    earned_on     TEXT NOT NULL,
    notes         TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_commission_events_earned ON commission_events(agent_id, earned_on);
`);

// Backfill existing tenancies → commission_events (idempotent via INSERT OR IGNORE)
{
  const pct = (db.prepare("SELECT commission_pct FROM agent_profile WHERE id=1").get() as { commission_pct: number } | undefined)?.commission_pct ?? 100;
  const tens = db.prepare(
    `SELECT id, contract_start, amount, owner_lead_id FROM tenancies WHERE contract_start IS NOT NULL`
  ).all() as Array<{ id: string; contract_start: string; amount: number; owner_lead_id: string | null }>;
  const ins = db.prepare(
    `INSERT OR IGNORE INTO commission_events (id, tenancy_id, owner_lead_id, type, amount, earned_on)
     VALUES (?, ?, ?, 'new_signing', ?, ?)`
  );
  db.transaction(() => {
    for (const t of tens) {
      ins.run(
        `ce_init_${t.id}`,
        t.id,
        t.owner_lead_id ?? null,
        Math.round(t.amount * pct / 100),
        t.contract_start,
      );
    }
  })();
}

// Guard: any 'listed' lead missing required details gets moved back to 'wants_rent'
// so the gate can enforce them being filled in before re-listing.
db.prepare(
  `UPDATE owner_leads
   SET stage = 'wants_rent'
   WHERE stage = 'listed'
     AND (property_name IS NULL OR expected_rent IS NULL OR bedrooms IS NULL OR bathrooms IS NULL)`
).run();

// Backfill: listed leads with no available_from get next-month as a sensible default.
db.prepare(
  `UPDATE owner_leads
   SET available_from = strftime('%Y-%m-01', date('now', '+1 month'))
   WHERE stage = 'listed' AND available_from IS NULL`
).run();

// ─── Seed (only on first run) ─────────────────────────────────────────────────

const propCount = (db.prepare("SELECT COUNT(*) as c FROM properties").get() as { c: number }).c;
if (propCount === 0) {
  const ip = db.prepare(
    `INSERT INTO properties (id,name,address,unit,owner_name,owner_phone) VALUES (?,?,?,?,?,?)`
  );
  const it = db.prepare(
    `INSERT INTO tenancies
       (id,property_id,tenant_name,tenant_phone,due_day,amount,
        current_month_paid,current_month_receipt_url,last_paid_month,lhdn_status,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  );
  db.transaction(() => {
    ip.run("prop_1","Residensi Mutiara, Unit A-12","Jalan Mutiara 1, Petaling Jaya, Selangor 47810","A-12","Hafiz Rahman","60123456789");
    ip.run("prop_2","Sri Damansara Apartment, B-03","Jalan Sri Damansara, Kuala Lumpur 52200","B-03","Hafiz Rahman","60123456789");
    ip.run("prop_3","Taman Desa House, No. 7","Jalan Desa 3, Taman Desa, Kuala Lumpur 58100",null,"Hafiz Rahman","60123456789");
    it.run("ten_1","prop_1","Ahmad Firdaus","60187654321",1,1800,0,null,"April 2026","none","Pending");
    it.run("ten_2","prop_2","Nurul Izzah","60191234567",5,2200,0,null,"April 2026","none","Reminder Sent");
    it.run("ten_3","prop_3","Lim Wei Jie","60112345678",10,1500,0,"https://placehold.co/800x600","April 2026","none","Paid - Pending Verification");
    it.run("ten_4","prop_1","Siti Rahayu","60169876543",1,950,1,"https://placehold.co/800x600","May 2026","generated","Verified");
  })();
}

// Backfill contract dates on demo tenancies (idempotent — only fills nulls)
{
  const isoDate = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const today = new Date();
  const minusMonths = (n: number) => {
    const d = new Date(today.getFullYear(), today.getMonth() - n, 1);
    return isoDate(d.getFullYear(), d.getMonth() + 1, 1);
  };
  const plusMonthsOf = (start: string, n: number) => {
    const [y, m, d] = start.split("-").map(Number);
    const dt = new Date(y, m - 1 + n, d);
    return isoDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  };

  const seeds: Array<[string, string, number]> = [
    // [tenancy_id, contract_start, duration_months]
    ["ten_1", minusMonths(11), 12],   // expires ~1 month from now → "Expiring 30d"
    ["ten_2", minusMonths(22), 24],   // expires ~2 months from now → "Expiring 60d"
    ["ten_3", minusMonths(6),  12],   // expires ~6 months from now → "Active"
    ["ten_4", minusMonths(14), 12],   // expired ~2 months ago     → "Expired"
  ];
  const upd = db.prepare(
    `UPDATE tenancies
     SET contract_start = ?, contract_end = ?, contract_duration_months = ?
     WHERE id = ? AND contract_start IS NULL`
  );
  for (const [id, start, months] of seeds) {
    upd.run(start, plusMonthsOf(start, months), months, id);
  }
}

// Seed account row
const accCount = (db.prepare("SELECT COUNT(*) as c FROM account").get() as { c: number }).c;
if (accCount === 0) db.prepare("INSERT INTO account (id,tier) VALUES (1,'starter')").run();

// Seed agent profile (default if missing)
const agentCount = (db.prepare("SELECT COUNT(*) as c FROM agent_profile").get() as { c: number }).c;
if (agentCount === 0) {
  db.prepare(
    "INSERT INTO agent_profile (id, name, phone, agency) VALUES (1, ?, ?, ?)"
  ).run("Howard Ho", "60107609699", "Wonders Property");
}

// Seed demo tenant profiles + attach to the first listed owner lead (if one
// exists). Runs only once per fresh DB. Lets the agent test the matching flow
// without entering tenants by hand.
const tpCount = (db.prepare("SELECT COUNT(*) as c FROM tenant_profiles").get() as { c: number }).c;
if (tpCount === 0) {
  const firstListed = db.prepare(
    "SELECT id, property_name, unit, expected_rent, bedrooms, bathrooms FROM owner_leads WHERE stage = 'listed' ORDER BY created_at ASC LIMIT 1"
  ).get() as { id: string; property_name: string | null; unit: string | null; expected_rent: number | null; bedrooms: number | null; bathrooms: number | null } | undefined;

  type Demo = {
    name: string; phone: string; age: number; occupation: string; nationality: string;
    income: number; budget_max: number; bedrooms_pref: number; move_in: string;
    occupants: number; pets?: 0 | 1; smoking?: 0 | 1; notes: string;
  };
  const demos: Demo[] = [
    { name: "Aishah Tan",    phone: "60111111111", age: 28, occupation: "Senior software engineer", nationality: "Malaysian",
      income: 9500,  budget_max: 2200, bedrooms_pref: 2, move_in: "2026-06-15", occupants: 2, pets: 0, smoking: 0,
      notes: "Working remotely most days. Quiet professional couple, no pets, non-smoker." },
    { name: "Jordan Lee",    phone: "60122222222", age: 32, occupation: "Marketing director", nationality: "Singaporean",
      income: 12000, budget_max: 3000, bedrooms_pref: 3, move_in: "2026-07-01", occupants: 3, pets: 1, smoking: 0,
      notes: "Family of three with one cat. 2-year contract preferred." },
    { name: "Priya Raj",     phone: "60133333333", age: 26, occupation: "Resident doctor",       nationality: "Malaysian",
      income: 8000,  budget_max: 2000, bedrooms_pref: 2, move_in: "2026-06-01", occupants: 1, pets: 0, smoking: 0,
      notes: "Long shifts at the hospital. Looking for somewhere quiet near KLCC." },
    { name: "Wong Chee Mun", phone: "60144444444", age: 35, occupation: "Architect",             nationality: "Malaysian",
      income: 11000, budget_max: 2500, bedrooms_pref: 2, move_in: "2026-08-01", occupants: 2, pets: 0, smoking: 0,
      notes: "Working couple. Both Malaysian. Will provide payslips and references." },
    { name: "Rina Mohamed",  phone: "60155555555", age: 24, occupation: "MBA student",           nationality: "Indonesian",
      income: 5000,  budget_max: 1800, bedrooms_pref: 1, move_in: "2026-06-20", occupants: 1, pets: 0, smoking: 0,
      notes: "International student at INSEAD KL campus. 1-year contract." },
  ];

  const insertProfile = db.prepare(
    `INSERT INTO tenant_profiles
      (id, name, phone, age, occupation, nationality, monthly_income, budget_max,
       bedrooms_pref, preferred_move_in, occupants, pets, smoking, notes, source)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'manual')`
  );
  const insertPack = db.prepare(
    `INSERT INTO match_packs (id, owner_lead_id, share_token, property_label, property_rent, property_beds, property_baths)
     VALUES (?,?,?,?,?,?,?)`
  );
  const insertEntry = db.prepare(
    `INSERT OR IGNORE INTO match_pack_tenants (pack_id, tenant_profile_id, position) VALUES (?,?,?)`
  );

  db.transaction(() => {
    const tenantIds: string[] = [];
    demos.forEach((d, i) => {
      const id = `tp_seed_${i + 1}`;
      insertProfile.run(
        id, d.name, d.phone, d.age, d.occupation, d.nationality, d.income, d.budget_max,
        d.bedrooms_pref, d.move_in, d.occupants, d.pets ?? 0, d.smoking ?? 0, d.notes
      );
      tenantIds.push(id);
    });

    if (firstListed) {
      // Pack might already exist (from getOrCreateMatchPack on the matching page).
      // Skip seeding if so — agent's existing pack stays as-is.
      const existingPack = db.prepare(`SELECT id FROM match_packs WHERE owner_lead_id = ?`).get(firstListed.id) as { id: string } | undefined;
      if (!existingPack) {
        const packId = `pack_seed_${firstListed.id}`;
        const token  = `seed${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
        const label  = firstListed.property_name
          ? firstListed.unit ? `${firstListed.property_name}, Unit ${firstListed.unit}` : firstListed.property_name
          : "Owner property";
        insertPack.run(packId, firstListed.id, token, label, firstListed.expected_rent, firstListed.bedrooms, firstListed.bathrooms);
        tenantIds.forEach((tid, i) => insertEntry.run(packId, tid, i));
      }
    }
  })();
}

// DEMO: split phone numbers across two test recipients so the user can
// have a real two-sided WhatsApp conversation flow (one person can reply).
// Runs on every boot — safe because we're still pre-launch with seeded data.
{
  const phoneA = process.env.KAKISEWA_DEMO_PHONE   ?? "60107609699"; // Howard
  const phoneB = process.env.KAKISEWA_DEMO_PHONE_2 ?? "60163119330"; // second recipient

  // Owners (3 properties) — alternate
  db.prepare("UPDATE properties SET owner_phone = ? WHERE id = 'prop_1'").run(phoneA);
  db.prepare("UPDATE properties SET owner_phone = ? WHERE id = 'prop_2'").run(phoneB);
  db.prepare("UPDATE properties SET owner_phone = ? WHERE id = 'prop_3'").run(phoneA);

  // Tenants — alternate
  db.prepare("UPDATE tenancies SET tenant_phone = ? WHERE id = 'ten_1'").run(phoneA); // Ahmad
  db.prepare("UPDATE tenancies SET tenant_phone = ? WHERE id = 'ten_2'").run(phoneB); // Nurul
  db.prepare("UPDATE tenancies SET tenant_phone = ? WHERE id = 'ten_3'").run(phoneA); // Lim
  db.prepare("UPDATE tenancies SET tenant_phone = ? WHERE id = 'ten_4'").run(phoneB); // Siti

  // Any newer demo records that might exist — keep them on phone A
  db.prepare(
    `UPDATE tenancies SET tenant_phone = ?
     WHERE id NOT IN ('ten_1','ten_2','ten_3','ten_4') AND tenant_phone NOT IN (?, ?)`
  ).run(phoneA, phoneA, phoneB);
}

// Seed rent_payments history — runs once when table is empty.
// Generates 3 months of realistic payment records per tenancy so the
// dashboard donut + backlog widgets have data to render.
const payCount = (db.prepare("SELECT COUNT(*) as c FROM rent_payments").get() as { c: number }).c;
if (payCount === 0) {
  type SeedTen = { id: string; amount: number };
  const tens = db.prepare("SELECT id, amount FROM tenancies").all() as SeedTen[];
  if (tens.length > 0) {
    const now = new Date();
    const months = [-2, -1, 0].map((delta) => {
      const d = new Date(now.getFullYear(), now.getMonth() + delta, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    const insert = db.prepare(
      `INSERT INTO rent_payments (id, tenancy_id, month, amount, paid_at, status)
       VALUES (?,?,?,?,?,?)`
    );
    db.transaction(() => {
      tens.forEach((t, idx) => {
        // Two months ago: everyone paid
        insert.run(`pay_${t.id}_${months[0]}`, t.id, months[0], t.amount,
          new Date(now.getFullYear(), now.getMonth() - 2, 5).toISOString(), "verified");
        // Last month: most paid, one pending (skip 1 in 4)
        if (idx % 4 !== 0) {
          insert.run(`pay_${t.id}_${months[1]}`, t.id, months[1], t.amount,
            new Date(now.getFullYear(), now.getMonth() - 1, 6).toISOString(), "verified");
        } else {
          insert.run(`pay_${t.id}_${months[1]}`, t.id, months[1], t.amount,
            null, "pending");
        }
        // Current month: matches the tenancy.current_month_paid flag
        const cur = db.prepare("SELECT current_month_paid, current_month_receipt_url, status FROM tenancies WHERE id=?").get(t.id) as
          { current_month_paid: number; current_month_receipt_url: string | null; status: string } | undefined;
        if (cur) {
          insert.run(
            `pay_${t.id}_${months[2]}`, t.id, months[2], t.amount,
            cur.current_month_paid ? new Date().toISOString() : null,
            cur.current_month_paid ? "verified" :
              cur.status === "Paid - Pending Verification" ? "paid" : "pending"
          );
        }
      });
    })();
  }
}

// Seed diverse owner leads across all stages (demo scenarios, idempotent)
{
  type SeedLead = { id: string; owner_name: string; owner_phone: string; property_name: string | null; unit: string | null; expected_rent: number | null; bedrooms: number | null; bathrooms: number | null; stage: string; notes: string | null };
  const seedLeads: SeedLead[] = [
    { id: "ol_seed_wr_1", owner_name: "Datin Rozita", owner_phone: "60112233001", property_name: "Verve Suites Mont Kiara", unit: null, expected_rent: null, bedrooms: null, bathrooms: null, stage: "wants_rent", notes: "Replied within 5 minutes, very interested" },
    { id: "ol_seed_wr_2", owner_name: "Kevin Lim", owner_phone: "60112233002", property_name: "EcoSky Kuala Lumpur", unit: null, expected_rent: null, bedrooms: null, bathrooms: null, stage: "wants_rent", notes: null },
    { id: "ol_seed_wr_3", owner_name: "Puan Sri Hajjah Norma", owner_phone: "60112233003", property_name: "Pavilion Residences KLCC", unit: null, expected_rent: null, bedrooms: null, bathrooms: null, stage: "wants_rent", notes: "Prefers long-term tenant" },
    { id: "ol_seed_ls_1",  owner_name: "Encik Azlan",          owner_phone: "60112233011", property_name: "Agile Mont Kiara",         unit: "B-1802", expected_rent: 3800, bedrooms: 3, bathrooms: 2, stage: "listed", notes: "Fully furnished, prefer working professional" },
    { id: "ol_seed_ls_2",  owner_name: "Michelle Ng",          owner_phone: "60112233012", property_name: "Skypark One City",          unit: "D-1105", expected_rent: 2500, bedrooms: 2, bathrooms: 2, stage: "listed", notes: "No pets, no smoking" },
    { id: "ol_seed_ls_3",  owner_name: "Hafiz Azman",          owner_phone: "60112233013", property_name: "Verdana Bukit Jalil",      unit: "A-0905", expected_rent: 2200, bedrooms: 3, bathrooms: 2, stage: "listed", notes: null },
    { id: "ol_seed_ls_4",  owner_name: "Tan Sri Lim Wei",      owner_phone: "60112233041", property_name: "Agile Mont Kiara",         unit: "A-5205", expected_rent: 3000, bedrooms: 2, bathrooms: 2, stage: "listed", notes: "High floor, city view" },
    { id: "ol_seed_ls_5",  owner_name: "Puan Siti Rahimah",    owner_phone: "60112233042", property_name: "The Capers Sentul East",   unit: "C-1103", expected_rent: 1900, bedrooms: 2, bathrooms: 1, stage: "listed", notes: "Near LRT, prefer couples or single" },
    { id: "ol_seed_ls_6",  owner_name: "Derek Chong",          owner_phone: "60112233043", property_name: "Arte S Ampang",            unit: "B-2208", expected_rent: 2800, bedrooms: 3, bathrooms: 2, stage: "listed", notes: "Partially furnished, flexible on move-in date" },
    { id: "ol_seed_ls_7",  owner_name: "Nurul Izzah Ahmad",    owner_phone: "60112233044", property_name: "M Vertica Cheras",        unit: "T3-1502", expected_rent: 2100, bedrooms: 2, bathrooms: 2, stage: "listed", notes: "No smokers, 1 month deposit" },
    { id: "ol_seed_ls_8",  owner_name: "Jonathan Yap",         owner_phone: "60112233045", property_name: "KLCC Kia Peng Residences", unit: "11A",    expected_rent: 5200, bedrooms: 3, bathrooms: 3, stage: "listed", notes: "Full KLCC view, fully furnished, premium unit" },
    { id: "ol_seed_ls_9",  owner_name: "Datin Faridah Hamid",  owner_phone: "60112233046", property_name: "Nadi Bangsar",            unit: "D-0802", expected_rent: 3400, bedrooms: 3, bathrooms: 2, stage: "listed", notes: "Walking distance to Bangsar Village, no pets" },
    { id: "ol_seed_ls_10", owner_name: "Raj Kumar",            owner_phone: "60112233047", property_name: "Sunway Nexis Kota Damansara", unit: "B-1601", expected_rent: 2300, bedrooms: 2, bathrooms: 2, stage: "listed", notes: "Near Sunway Giza, prefer professional tenants" },
    { id: "ol_seed_ls_11", owner_name: "Cassandra Wong",       owner_phone: "60112233048", property_name: "Tropicana The Residences", unit: "A-2904", expected_rent: 4100, bedrooms: 3, bathrooms: 3, stage: "listed", notes: "Brand new, never lived in, fully furnished" },
    { id: "ol_seed_ls_12", owner_name: "Encik Zulkifli Daud",  owner_phone: "60112233049", property_name: "Residensi Sefina TTDI",   unit: "C-0603", expected_rent: 2600, bedrooms: 3, bathrooms: 2, stage: "listed", notes: "Gated community, family preferred" },
    { id: "ol_seed_ls_13", owner_name: "Shirley Teh",          owner_phone: "60112233050", property_name: "Setia Sky Residences",    unit: "E-1208", expected_rent: 3100, bedrooms: 2, bathrooms: 2, stage: "listed", notes: "Infinity pool view, working professionals only" },
    { id: "ol_seed_mt_1", owner_name: "Datuk Reza", owner_phone: "60112233021", property_name: "The Westside Two", unit: "C-2201", expected_rent: 5500, bedrooms: 4, bathrooms: 3, stage: "matched", notes: "Premium unit, great KLCC view" },
  ];
  const ins = db.prepare(
    `INSERT OR IGNORE INTO owner_leads (id, owner_name, owner_phone, property_name, unit, expected_rent, bedrooms, bathrooms, stage, notes, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')`
  );
  for (const l of seedLeads) {
    ins.run(l.id, l.owner_name, l.owner_phone, l.property_name, l.unit, l.expected_rent, l.bedrooms, l.bathrooms, l.stage, l.notes);
  }
}

// Seed rented property examples (idempotent — INSERT OR IGNORE)
{
  const rentedPropSeeds = [
    { id: "prop_rent_1", name: "Sentral Suites KLCC", address: "Jalan Stesen Sentral 5, KL Sentral, 50470 Kuala Lumpur", unit: "E-1501", owner_name: "Cik Amalina Ahmad", owner_phone: "60112233031" },
    { id: "prop_rent_2", name: "Sunway Velocity", address: "Jalan Cheras, 55200 Kuala Lumpur", unit: "A-802", owner_name: "Puan Haslinda Mohd", owner_phone: "60112233032" },
    { id: "prop_rent_3", name: "The Elements", address: "Jalan Ampang, 68000 Ampang, Selangor", unit: "B-1204", owner_name: "Encik Farouk Ibrahim", owner_phone: "60112233033" },
  ];
  const insertProp = db.prepare(
    `INSERT OR IGNORE INTO properties (id,name,address,unit,owner_name,owner_phone) VALUES (?,?,?,?,?,?)`
  );
  for (const p of rentedPropSeeds) {
    insertProp.run(p.id, p.name, p.address, p.unit, p.owner_name, p.owner_phone);
  }

  // Owner leads in matched stage
  const rentedLeadSeeds = [
    { id: "ol_rent_1", owner_name: "Cik Amalina Ahmad", owner_phone: "60112233031", property_name: "Sentral Suites KLCC", unit: "E-1501", expected_rent: 3200, bedrooms: 2, bathrooms: 2, stage: "matched", notes: "High-floor unit, fully furnished" },
    { id: "ol_rent_2", owner_name: "Puan Haslinda Mohd", owner_phone: "60112233032", property_name: "Sunway Velocity", unit: "A-802", expected_rent: 2800, bedrooms: 3, bathrooms: 2, stage: "matched", notes: "Near Cheras Leisure Mall" },
    { id: "ol_rent_3", owner_name: "Encik Farouk Ibrahim", owner_phone: "60112233033", property_name: "The Elements", unit: "B-1204", expected_rent: 2400, bedrooms: 2, bathrooms: 1, stage: "matched", notes: "Near Ampang Park" },
  ];
  const insertLead = db.prepare(
    `INSERT OR IGNORE INTO owner_leads (id, owner_name, owner_phone, property_name, unit, expected_rent, bedrooms, bathrooms, stage, notes, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')`
  );
  for (const l of rentedLeadSeeds) {
    insertLead.run(l.id, l.owner_name, l.owner_phone, l.property_name, l.unit, l.expected_rent, l.bedrooms, l.bathrooms, l.stage, l.notes);
  }

  // Tenancies for rented properties (2 expiring within 60 days, 1 active long-term)
  // ten_rent_1: started 2025-06-01, 12-month → expires 2026-06-01 (~22 days left)
  // ten_rent_2: started 2025-07-15, 12-month → expires 2026-07-15 (~66 days left)
  // ten_rent_3: started 2026-02-01, 12-month → expires 2027-02-01 (~9 months left)
  const tenancySeeds = [
    { id: "ten_rent_1", property_id: "prop_rent_1", tenant_name: "Daniel Foo", tenant_phone: "60112244001", due_day: 1, amount: 3200, contract_start: "2025-06-01", contract_end: "2026-06-01", contract_duration_months: 12, lifecycle_stage: "headsup" },
    { id: "ten_rent_2", property_id: "prop_rent_2", tenant_name: "Asha Kumari", tenant_phone: "60112244002", due_day: 15, amount: 2800, contract_start: "2025-07-15", contract_end: "2026-07-15", contract_duration_months: 12, lifecycle_stage: "headsup" },
    { id: "ten_rent_3", property_id: "prop_rent_3", tenant_name: "Marcus Tan", tenant_phone: "60112244003", due_day: 1, amount: 2400, contract_start: "2026-02-01", contract_end: "2027-02-01", contract_duration_months: 12, lifecycle_stage: null },
  ];
  const insertTen = db.prepare(
    `INSERT OR IGNORE INTO tenancies
       (id, property_id, tenant_name, tenant_phone, due_day, amount,
        current_month_paid, lhdn_status, status,
        contract_start, contract_end, contract_duration_months, lifecycle_stage)
     VALUES (?,?,?,?,?,?,0,'none','Pending',?,?,?,?)`
  );
  for (const t of tenancySeeds) {
    insertTen.run(t.id, t.property_id, t.tenant_name, t.tenant_phone, t.due_day, t.amount,
      t.contract_start, t.contract_end, t.contract_duration_months, t.lifecycle_stage);
  }

  // Link rented tenancies to their owner leads (idempotent)
  db.prepare("UPDATE tenancies SET owner_lead_id = 'ol_rent_1' WHERE id = 'ten_rent_1' AND owner_lead_id IS NULL").run();
  db.prepare("UPDATE tenancies SET owner_lead_id = 'ol_rent_2' WHERE id = 'ten_rent_2' AND owner_lead_id IS NULL").run();
  db.prepare("UPDATE tenancies SET owner_lead_id = 'ol_rent_3' WHERE id = 'ten_rent_3' AND owner_lead_id IS NULL").run();
}

// Seed tenancy for any matched lead named Siti Nurhaliza (Agile Mont Kiara A2908 — user-added)
{
  const sn = db.prepare("SELECT id FROM owner_leads WHERE owner_name = 'Siti Nurhaliza' AND stage = 'matched' LIMIT 1").get() as { id: string } | undefined;
  if (sn) {
    db.prepare("INSERT OR IGNORE INTO properties (id,name,address,unit,owner_name,owner_phone) VALUES (?,?,?,?,?,?)")
      .run("prop_sn_1", "Agile Mont Kiara", "Mont Kiara, 50480 Kuala Lumpur", "A2908", "Siti Nurhaliza", "60123344556");
    db.prepare(`
      INSERT OR IGNORE INTO tenancies
        (id, property_id, tenant_name, tenant_phone, due_day, amount,
         current_month_paid, lhdn_status, status,
         contract_start, contract_end, contract_duration_months, lifecycle_stage)
      VALUES (?,?,?,?,?,?,0,'none','Pending',?,?,?,?)
    `).run("ten_sn_1", "prop_sn_1", "Haziq Rahman", "60112266001", 5, 5000,
           "2025-09-01", "2026-09-01", 12, null);
    db.prepare("UPDATE tenancies SET owner_lead_id = ? WHERE id = 'ten_sn_1' AND owner_lead_id IS NULL").run(sn.id);
  }
}

// Seed tenancy for ol_seed_mt_1 (Datuk Reza / The Westside Two) so the Matched card shows its tenant
{
  db.prepare(`INSERT OR IGNORE INTO properties (id,name,address,unit,owner_name,owner_phone) VALUES (?,?,?,?,?,?)`)
    .run("prop_seed_mt_1", "The Westside Two", "Desa ParkCity, 52200 Kuala Lumpur", "C-2201", "Datuk Reza", "60112233021");

  db.prepare(`
    INSERT OR IGNORE INTO tenancies
      (id, property_id, tenant_name, tenant_phone, due_day, amount,
       current_month_paid, lhdn_status, status,
       contract_start, contract_end, contract_duration_months, lifecycle_stage)
    VALUES (?,?,?,?,?,?,0,'none','Pending',?,?,?,?)
  `).run("ten_seed_mt_1", "prop_seed_mt_1", "Lee Shu Wei", "60112255001", 1, 5500,
         "2025-08-01", "2026-08-01", 12, null);

  db.prepare("UPDATE tenancies SET owner_lead_id = 'ol_seed_mt_1' WHERE id = 'ten_seed_mt_1' AND owner_lead_id IS NULL").run();
}

// Seed Jan–May 2026 commission history (idempotent — INSERT OR IGNORE)
{
  const insertProp = db.prepare(
    `INSERT OR IGNORE INTO properties (id,name,address,unit,owner_name,owner_phone) VALUES (?,?,?,?,?,?)`
  );
  const insertLead = db.prepare(
    `INSERT OR IGNORE INTO owner_leads
       (id,owner_name,owner_phone,property_name,unit,expected_rent,bedrooms,bathrooms,stage,notes,source)
     VALUES (?,?,?,?,?,?,?,?,?,?,'manual')`
  );
  const insertTen = db.prepare(
    `INSERT OR IGNORE INTO tenancies
       (id,property_id,tenant_name,tenant_phone,due_day,amount,
        current_month_paid,lhdn_status,status,
        contract_start,contract_end,contract_duration_months,lifecycle_stage,owner_lead_id)
     VALUES (?,?,?,?,?,?,0,'none','Verified',?,?,12,?,?)`
  );

  const props = [
    ["prop_hist_1",  "Cascadia Condo",         "Jalan Semantan, Damansara Heights, 50490 KL",           "B-1201",   "Puan Norlaila Yusof",     "60112281001"],
    ["prop_hist_2",  "D'Sara Sentral",          "Jalan Sungai Jernih, Sri Damansara, 52200 KL",          "C-0805",   "Encik Rashdan Bakar",     "60112281002"],
    ["prop_hist_3",  "Vogue Suites One",        "Jalan Kerinchi, Bangsar South, 59200 KL",               "A-1508",   "Dato Hashim Ariff",       "60112281003"],
    ["prop_hist_4",  "Connaught Avenue",        "Jalan Cangkat, Cheras, 56000 KL",                       "D-2201",   "Jennifer Tan Siew Ling",  "60112281004"],
    ["prop_hist_5",  "Reflection Residences",   "Jalan Kiara 5, Mont Kiara, 50480 KL",                   "E-1102",   "Encik Zahari Othman",     "60112281005"],
    ["prop_hist_6",  "Tropicana Metropark",     "Persiaran Tropicana, Petaling Jaya, 47810 Selangor",    "T1-0601",  "Linda Cheah Boon Lim",    "60112281006"],
    ["prop_hist_7",  "The Leafz Suzana",        "Jalan Sg Besi, Salak South, 57100 KL",                  "B-0903",   "Datin Rosmah Hashim",     "60112281007"],
    ["prop_hist_8",  "Panorama Residences",     "Jalan Pandan Indah 1/23, Pandan Indah, 55100 KL",       "A-1505",   "Kenny Ho Weng Kit",       "60112281008"],
    ["prop_hist_9",  "Alila Bangsar",           "Jalan Maarof, Bangsar, 59100 KL",                       "C-2103",   "Puan Azura Sulaiman",     "60112281009"],
    ["prop_hist_10", "Glomac Damansara",        "Jalan Damansara, Damansara Heights, 50490 KL",           "B-1407",   "Encik Nadzri Rahman",     "60112281010"],
  ] as const;

  const leads = [
    ["ol_hist_1",  "Puan Norlaila Yusof",    "60112281001", "Cascadia Condo",        "B-1201",   3500, 3, 2, "matched", "Long-term tenant preferred"],
    ["ol_hist_2",  "Encik Rashdan Bakar",    "60112281002", "D'Sara Sentral",         "C-0805",   3600, 3, 2, "matched", "Fully furnished"],
    ["ol_hist_3",  "Dato Hashim Ariff",      "60112281003", "Vogue Suites One",       "A-1508",   2800, 2, 2, "matched", "Near LRT Bangsar South"],
    ["ol_hist_4",  "Jennifer Tan Siew Ling", "60112281004", "Connaught Avenue",       "D-2201",   3200, 3, 2, "matched", "Near Cheras LRT"],
    ["ol_hist_5",  "Encik Zahari Othman",    "60112281005", "Reflection Residences",  "E-1102",   2600, 2, 2, "matched", "Mont Kiara location"],
    ["ol_hist_6",  "Linda Cheah Boon Lim",   "60112281006", "Tropicana Metropark",    "T1-0601",  3000, 2, 2, "matched", "Gated community"],
    ["ol_hist_7",  "Datin Rosmah Hashim",    "60112281007", "The Leafz Suzana",       "B-0903",   3600, 3, 2, "matched", "Near Sg Besi highway"],
    ["ol_hist_8",  "Kenny Ho Weng Kit",      "60112281008", "Panorama Residences",    "A-1505",   3200, 2, 2, "matched", "Quiet neighbourhood"],
    ["ol_hist_9",  "Puan Azura Sulaiman",    "60112281009", "Alila Bangsar",          "C-2103",   3900, 3, 2, "matched", "High floor, city view"],
    ["ol_hist_10", "Encik Nadzri Rahman",    "60112281010", "Glomac Damansara",       "B-1407",   3500, 3, 2, "matched", "Near Damansara Utama"],
  ] as const;

  // Jan: 3500 + 3600 = 7100 | Feb: 2800 + 3200 = 6000 | Mar: 2600 + 3000 + 3600 = 9200
  // Apr: 3200 + 3900 = 7100 | May: 3500
  const tenancies = [
    ["ten_hist_1",  "prop_hist_1",  "Bryan Loh Zhen Hao",       "60112291001",  1, 3500, "2026-01-01", "2027-01-01", null, "ol_hist_1"],
    ["ten_hist_2",  "prop_hist_2",  "Chen Mei Ling",             "60112291002", 15, 3600, "2026-01-15", "2027-01-15", null, "ol_hist_2"],
    ["ten_hist_3",  "prop_hist_3",  "Kavitha Rajan",             "60112291003",  1, 2800, "2026-02-01", "2027-02-01", null, "ol_hist_3"],
    ["ten_hist_4",  "prop_hist_4",  "Ahmad Syafiq Hamdan",       "60112291004", 10, 3200, "2026-02-10", "2027-02-10", null, "ol_hist_4"],
    ["ten_hist_5",  "prop_hist_5",  "Sam Ooi Wei Kian",          "60112291005",  1, 2600, "2026-03-01", "2027-03-01", null, "ol_hist_5"],
    ["ten_hist_6",  "prop_hist_6",  "Nur Ain Hafeez",            "60112291006", 10, 3000, "2026-03-10", "2027-03-10", null, "ol_hist_6"],
    ["ten_hist_7",  "prop_hist_7",  "Raj Prakash Subramaniam",   "60112291007", 20, 3600, "2026-03-20", "2027-03-20", null, "ol_hist_7"],
    ["ten_hist_8",  "prop_hist_8",  "Suriani Kamarudin",         "60112291008",  5, 3200, "2026-04-05", "2027-04-05", null, "ol_hist_8"],
    ["ten_hist_9",  "prop_hist_9",  "Chris Wang Jun Kang",       "60112291009", 15, 3900, "2026-04-15", "2027-04-15", null, "ol_hist_9"],
    ["ten_hist_10", "prop_hist_10", "Thanuja Pillay",             "60112291010",  1, 3500, "2026-05-01", "2027-05-01", null, "ol_hist_10"],
  ] as const;

  db.transaction(() => {
    for (const p of props)  insertProp.run(...p);
    for (const l of leads)  insertLead.run(...l);
    for (const t of tenancies) insertTen.run(...t);
  })();
}

// 5 extra "Expiring" seed cards for testing (idempotent — INSERT OR IGNORE)
{
  const today = new Date();
  const isoD = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return isoD(d); };
  const subYears = (s: string, y: number) => { const d = new Date(s); d.setFullYear(d.getFullYear() - y); return isoD(d); };

  const expProps = [
    { id: "prop_exp_1", name: "Bangsar South Suites",      address: "Jalan Kerinchi, Bangsar South, 59200 KL", unit: "C-2105", owner_name: "Datin Rashidah Abdul",   owner_phone: "60112251001" },
    { id: "prop_exp_2", name: "KL Eco City Residences",    address: "Jalan Bangsar, 59200 KL",                 unit: "A-0805", owner_name: "Raymond Loh",            owner_phone: "60112251002" },
    { id: "prop_exp_3", name: "Hartamas Regency 2",        address: "Sri Hartamas, 50480 Kuala Lumpur",        unit: "B-1403", owner_name: "Encik Hafizuddin Yusri", owner_phone: "60112251003" },
    { id: "prop_exp_4", name: "Damai Residences Ampang",   address: "Jalan Damai, Ampang, 55000 KL",           unit: "D-0602", owner_name: "Puan Rozana Ismail",     owner_phone: "60112251004" },
    { id: "prop_exp_5", name: "Damansara City Residences", address: "Jalan Damansara, 50490 Kuala Lumpur",     unit: "E-2201", owner_name: "Steven Lim Kwang Hock",  owner_phone: "60112251005" },
  ];
  const insertExpProp = db.prepare(`INSERT OR IGNORE INTO properties (id,name,address,unit,owner_name,owner_phone) VALUES (?,?,?,?,?,?)`);
  for (const p of expProps) insertExpProp.run(p.id, p.name, p.address, p.unit, p.owner_name, p.owner_phone);

  const expLeads = [
    { id: "ol_exp_1", owner_name: "Datin Rashidah Abdul",   owner_phone: "60112251001", property_name: "Bangsar South Suites",      unit: "C-2105", expected_rent: 3500, bedrooms: 3, bathrooms: 2, notes: "Long-term owner, very communicative" },
    { id: "ol_exp_2", owner_name: "Raymond Loh",            owner_phone: "60112251002", property_name: "KL Eco City Residences",    unit: "A-0805", expected_rent: 4200, bedrooms: 2, bathrooms: 2, notes: "Prefers working professionals" },
    { id: "ol_exp_3", owner_name: "Encik Hafizuddin Yusri", owner_phone: "60112251003", property_name: "Hartamas Regency 2",        unit: "B-1403", expected_rent: 2800, bedrooms: 3, bathrooms: 2, notes: "No smokers, prefer family" },
    { id: "ol_exp_4", owner_name: "Puan Rozana Ismail",     owner_phone: "60112251004", property_name: "Damai Residences Ampang",   unit: "D-0602", expected_rent: 2200, bedrooms: 2, bathrooms: 1, notes: null },
    { id: "ol_exp_5", owner_name: "Steven Lim Kwang Hock",  owner_phone: "60112251005", property_name: "Damansara City Residences", unit: "E-2201", expected_rent: 5000, bedrooms: 3, bathrooms: 3, notes: "High-floor, fully furnished, premium" },
  ];
  const insertExpLead = db.prepare(`INSERT OR IGNORE INTO owner_leads (id,owner_name,owner_phone,property_name,unit,expected_rent,bedrooms,bathrooms,stage,notes,source) VALUES (?,?,?,?,?,?,?,?,'matched',?,'manual')`);
  for (const l of expLeads) insertExpLead.run(l.id, l.owner_name, l.owner_phone, l.property_name, l.unit, l.expected_rent, l.bedrooms, l.bathrooms, l.notes);

  const insertExpTen = db.prepare(`
    INSERT OR IGNORE INTO tenancies
      (id,property_id,tenant_name,tenant_phone,due_day,amount,
       current_month_paid,lhdn_status,status,
       contract_start,contract_end,contract_duration_months,lifecycle_stage,owner_lead_id)
    VALUES (?,?,?,?,?,?,0,'none','Pending',?,?,12,'headsup',?)`);

  const expTens = [
    { id: "ten_exp_1", pid: "prop_exp_1", ol: "ol_exp_1", name: "Priya Sundaram",        phone: "60112261001", due: 1,  amt: 3500, daysLeft: 10 },
    { id: "ten_exp_2", pid: "prop_exp_2", ol: "ol_exp_2", name: "Jason Teoh Wei Ming",    phone: "60112261002", due: 5,  amt: 4200, daysLeft: 20 },
    { id: "ten_exp_3", pid: "prop_exp_3", ol: "ol_exp_3", name: "Zulaikha Hamid",         phone: "60112261003", due: 1,  amt: 2800, daysLeft: 30 },
    { id: "ten_exp_4", pid: "prop_exp_4", ol: "ol_exp_4", name: "Mohd Azlan Sharifuddin", phone: "60112261004", due: 10, amt: 2200, daysLeft: 45 },
    { id: "ten_exp_5", pid: "prop_exp_5", ol: "ol_exp_5", name: "Cindy Tan Siew Ying",    phone: "60112261005", due: 15, amt: 5000, daysLeft: 57 },
  ];
  for (const t of expTens) {
    const contractEnd   = addDays(t.daysLeft);
    const contractStart = subYears(contractEnd, 1);
    insertExpTen.run(t.id, t.pid, t.name, t.phone, t.due, t.amt, contractStart, contractEnd, t.ol);
  }
}

// v9 — property supports directory
db.exec(`
  CREATE TABLE IF NOT EXISTS property_supports (
    id         TEXT PRIMARY KEY,
    agent_id   TEXT NOT NULL DEFAULT 'dev_agent_howard',
    name       TEXT NOT NULL,
    phone      TEXT NOT NULL,
    type       TEXT NOT NULL CHECK(type IN (
      'cleaner','electrician','plumber','aircon',
      'renovation','interior_design','locksmith','pest_control','other'
    )),
    area       TEXT,
    notes      TEXT,
    starred    INTEGER NOT NULL DEFAULT 0,
    source     TEXT NOT NULL DEFAULT 'custom',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_property_supports_agent ON property_supports(agent_id, type);
`);

// Seed KL/Selangor contacts (v1 — INSERT OR IGNORE, safe to re-run)
// ⚠️  Numbers marked [confirmed] are from publicly listed business pages (trustedmalaysia.com,
//    airconhero.com, aircondcare.my). Numbers marked [placeholder] are demo entries —
//    replace with your own trusted contacts. Source: trustedmalaysia.com quarterly.
{
  const ins = db.prepare(
    `INSERT OR IGNORE INTO property_supports (id, name, phone, type, area, notes, source)
     VALUES (?, ?, ?, ?, ?, ?, 'seed')`
  );
  const seeds: [string, string, string, string, string, string][] = [
    // Cleaners — replace with your trusted cleaners
    ["sup_s_cl1", "GrabMaid",                      "60125671318", "cleaner",        "186 areas in Klang Valley", "[placeholder] Platform-based, book via grabmaid.my. 4-hr min session."],
    ["sup_s_cl2", "Bersih Home KL",                "60112388102", "cleaner",        "PJ, Subang, Shah Alam",     "[placeholder] Replace with your preferred cleaner."],
    ["sup_s_cl3", "CleanPro Selangor",             "60163388103", "cleaner",        "KL, Bangsar, TTDI",         "[placeholder] Replace with your preferred cleaner."],
    // Electricians — replace with ST-licensed contacts
    ["sup_s_el1", "Wira Electrical Services",      "60123388201", "electrician",    "KL, PJ, Damansara",         "[placeholder] Replace with ST-licensed electrician. Verify at myaccount.mytnb.com.my."],
    ["sup_s_el2", "KL Sparks Electrical",          "60112388202", "electrician",    "KL, Ampang, Wangsa Maju",   "[placeholder] Replace with your trusted electrician."],
    // Plumbers — 1 confirmed real listing from trustedmalaysia.com (May 2026)
    ["sup_s_pl1", "KL1 Plumber",                   "60162992233", "plumber",        "KL, Selangor",              "[confirmed] Listed on trustedmalaysia.com (2026). Pipe leaks, WC, water heater."],
    ["sup_s_pl2", "24H Plumber Selangor",          "60112388302", "plumber",        "PJ, Subang, Shah Alam",     "[placeholder] Replace with your trusted plumber."],
    // Air-Cond — 2 confirmed real companies from their own websites
    ["sup_s_ac1", "AirconHero",                    "60162992099", "aircon",         "Klang Valley (50+ areas)",  "[confirmed] airconhero.com. All brands. WhatsApp to book. Copyright 2025."],
    ["sup_s_ac2", "AircondCare",                   "60178730408", "aircon",         "KL & Selangor",             "[confirmed] aircondcare.my. Serving since 2010. Cleaning, gas top-up, repair."],
    ["sup_s_ac3", "Cool Air Servis",               "60173388403", "aircon",         "KL, Bangsar, Bukit Bintang","[placeholder] Replace with your preferred aircon technician."],
    // Renovation — visit trustedmalaysia.com/best-renovation-contractors-kuala-lumpur for current list
    ["sup_s_rv1", "Bina Megah Renovation",         "60122388501", "renovation",     "KL, Selangor",              "[placeholder] See trustedmalaysia.com for vetted renovation contractors (updated May 2026)."],
    ["sup_s_rv2", "HomeReno Experts PJ",           "60112388502", "renovation",     "PJ, Subang, Klang Valley",  "[placeholder] Replace with your trusted contractor."],
    // Interior Design — visit qanvast.com/my for 209+ vetted ID firms
    ["sup_s_id1", "Loft Studio Interiors",         "60123388601", "interior_design","Mont Kiara, Bangsar, KLCC", "[placeholder] See qanvast.com/my for vetted interior designers."],
    ["sup_s_id2", "Space Form Design KL",          "60112388602", "interior_design","PJ, Damansara, Subang",     "[placeholder] Replace with your preferred ID firm."],
    // Locksmith
    ["sup_s_lk1", "24 Hour Locksmith KL",          "60122388701", "locksmith",      "KL, PJ, Ampang",            "[placeholder] Replace with your trusted locksmith."],
    ["sup_s_lk2", "Kunci Express Selangor",        "60112388702", "locksmith",      "Subang, Shah Alam, Klang",  "[placeholder] Replace with your trusted locksmith."],
    // Pest Control — visit trustedmalaysia.com or mpma.my for licensed PCOs
    ["sup_s_pc1", "Shield Pest Management",        "60123388801", "pest_control",   "KL, Selangor",              "[placeholder] See mpma.my for MPMA-licensed pest control operators."],
    ["sup_s_pc2", "BioGuard Pest Control",         "60112388802", "pest_control",   "PJ, Subang, Shah Alam",     "[placeholder] Replace with your trusted pest control operator."],
    ["sup_s_pc3", "Perisai Pest KL",               "60163388803", "pest_control",   "KL, Cheras, Ampang",        "[placeholder] Replace with your trusted pest control operator."],
  ];
  db.transaction(() => { for (const s of seeds) ins.run(...s); })();
}

// v10 — owner notes on pack tenants
addIfMissing("match_pack_tenants", "owner_note", "TEXT");

// v11 — renewal intake tokens
addIfMissing("tenancies", "tenant_renewal_token",        "TEXT");
addIfMissing("tenancies", "owner_renewal_token",         "TEXT");
addIfMissing("tenancies", "tenant_renewal_completed_at", "TEXT");
addIfMissing("tenancies", "owner_renewal_completed_at",  "TEXT");

// v12 — owner-noted tenant intent
addIfMissing("tenancies", "owner_noted_tenant_intent",   "TEXT"); // 'yes'|'no'|'unsure'

// v13 — renewal proposed values (owner preference, not live contract)
addIfMissing("tenancies", "renewal_proposed_start",  "TEXT");
addIfMissing("tenancies", "renewal_proposed_months", "INTEGER");
addIfMissing("tenancies", "renewal_proposed_rent",   "REAL");

// v14 — tenant seeking status (set when owner leaves so tenant appears in All Tenants)
addIfMissing("tenant_profiles", "is_seeking",         "INTEGER NOT NULL DEFAULT 0");
addIfMissing("tenant_profiles", "seeking_from",       "TEXT");
addIfMissing("tenant_profiles", "seeking_budget_max", "REAL");

// v15 — motivation photo
addIfMissing("agent_profile", "motivation_photo_url", "TEXT");

// v16 — customisable WhatsApp templates (JSON object keyed by TemplateKey)
addIfMissing("agent_profile", "whatsapp_templates", "TEXT");

export default db;
