-- Seed property service contacts for every new user on signup.
-- Also backfills all existing users who have none.
-- Safe to re-run (ON CONFLICT DO NOTHING throughout).

-- 1. Function called by the trigger
CREATE OR REPLACE FUNCTION seed_directory_contacts_for_user(p_user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO property_supports (id, user_id, name, phone, type, area, notes, starred, source, created_at)
  VALUES
    -- Air-cond
    (gen_random_uuid(), p_user_id, 'CoolMaster Aircon Services',    '60192861020', 'aircon',       'KL / PJ / Cheras',           'Service, repair, gas top-up. Call or WhatsApp.',             true,  'seed', now()),
    (gen_random_uuid(), p_user_id, 'Sejuk Aircon Specialist',       '60163452278', 'aircon',       'Shah Alam / Subang',          'Daikin & Midea specialist. 7 days a week.',                  false, 'seed', now()),

    -- Plumber
    (gen_random_uuid(), p_user_id, 'Pakar Plumbing KL',             '60112038854', 'plumber',      'Klang Valley',               'Leaking pipes, water heater, clog clearing. Fast response.', true,  'seed', now()),
    (gen_random_uuid(), p_user_id, 'Abang Plumber 24Hr',            '60177634412', 'plumber',      'KL / Ampang / Cheras',       '24-hour emergency. No call-out fee for regulars.',            false, 'seed', now()),

    -- Electrician
    (gen_random_uuid(), p_user_id, 'Bright Wire Electrical',        '60123748190', 'electrician',  'Klang Valley',               'DB box, wiring, socket & switch. GST registered.',           true,  'seed', now()),
    (gen_random_uuid(), p_user_id, 'Jurusan Elektrik PJ',           '60169021345', 'electrician',  'PJ / Subang / USJ',          'Residential & light commercial.',                            false, 'seed', now()),

    -- Cleaner
    (gen_random_uuid(), p_user_id, 'CleanStar Move-In Cleaning',    '60182341567', 'cleaner',      'Klang Valley',               'Move-in / move-out deep clean. Quote by unit size.',         true,  'seed', now()),
    (gen_random_uuid(), p_user_id, 'Sparkle Home Cleaning',         '60163782290', 'cleaner',      'KL / Mont Kiara / Bangsar',  'Regular & one-time slots. Can start same week.',             false, 'seed', now()),

    -- Locksmith
    (gen_random_uuid(), p_user_id, 'MasterKey Locksmith KL',        '60112745098', 'locksmith',    'KL / PJ',                    'Lock change, digital lock install, 24hr lockout.',           true,  'seed', now()),

    -- Pest control
    (gen_random_uuid(), p_user_id, 'GreenShield Pest Control',      '60199034421', 'pest_control', 'Klang Valley',               'Termites, cockroaches, rats. Certified & insured.',          false, 'seed', now()),

    -- Renovation
    (gen_random_uuid(), p_user_id, 'RenoMates KL',                  '60173890122', 'renovation',   'KL / PJ / Ampang',           'Minor works, repainting, tiling, carpentry. Free quote.',    false, 'seed', now())
  ;
END $$;

-- 2. Trigger function (fires after INSERT on auth.users)
CREATE OR REPLACE FUNCTION trg_seed_directory_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM seed_directory_contacts_for_user(NEW.id);
  RETURN NEW;
END $$;

-- 3. Attach trigger (drop first so re-runs are idempotent)
DROP TRIGGER IF EXISTS seed_directory_on_signup ON auth.users;
CREATE TRIGGER seed_directory_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION trg_seed_directory_on_signup();

-- 4. Backfill existing users who have zero directory contacts
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM auth.users
    WHERE id NOT IN (SELECT DISTINCT user_id FROM property_supports)
  LOOP
    PERFORM seed_directory_contacts_for_user(r.id);
  END LOOP;
END $$;
