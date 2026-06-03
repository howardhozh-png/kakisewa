-- Seed property service contacts for Howard's account.
-- Run in Supabase SQL Editor. Safe to re-run (ON CONFLICT DO NOTHING).

DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'howardhozh@gmail.com';
  IF uid IS NULL THEN RAISE EXCEPTION 'User not found: howardhozh@gmail.com'; END IF;

  INSERT INTO property_supports (id, user_id, name, phone, type, area, notes, starred, source, created_at)
  VALUES
    -- Air-cond
    ('sup_seed_ac1',  uid, 'CoolMaster Aircon Services',    '60192861020', 'aircon',        'KL / PJ / Cheras',    'Service, repair, gas top-up. Call or WhatsApp.', 1, 'seed', now()),
    ('sup_seed_ac2',  uid, 'Sejuk Aircon Specialist',       '60163452278', 'aircon',        'Shah Alam / Subang',  'Daikin & Midea specialist. 7 days a week.', 0, 'seed', now()),

    -- Plumber
    ('sup_seed_pl1',  uid, 'Pakar Plumbing KL',             '60112038854', 'plumber',       'Klang Valley',        'Leaking pipes, water heater, clog clearing. Fast response.', 1, 'seed', now()),
    ('sup_seed_pl2',  uid, 'Abang Plumber 24Hr',            '60177634412', 'plumber',       'KL / Ampang / Cheras','24-hour emergency. No call-out fee for regulars.', 0, 'seed', now()),

    -- Electrician
    ('sup_seed_el1',  uid, 'Bright Wire Electrical',        '60123748190', 'electrician',   'Klang Valley',        'DB box, wiring, socket & switch. GST registered.', 1, 'seed', now()),
    ('sup_seed_el2',  uid, 'Jurusan Elektrik PJ',           '60169021345', 'electrician',   'PJ / Subang / USJ',   'Residential & light commercial.', 0, 'seed', now()),

    -- Cleaner
    ('sup_seed_cl1',  uid, 'CleanStar Move-In Cleaning',    '60182341567', 'cleaner',       'Klang Valley',        'Move-in / move-out deep clean. Quote by unit size.', 1, 'seed', now()),
    ('sup_seed_cl2',  uid, 'Sparkle Home Cleaning',         '60163782290', 'cleaner',       'KL / Mont Kiara / Bangsar', 'Regular & one-time slots. Can start same week.', 0, 'seed', now()),

    -- Locksmith
    ('sup_seed_lk1',  uid, 'MasterKey Locksmith KL',        '60112745098', 'locksmith',     'KL / PJ',             'Lock change, digital lock install, 24hr lockout.', 1, 'seed', now()),

    -- Pest control
    ('sup_seed_pc1',  uid, 'GreenShield Pest Control',      '60199034421', 'pest_control',  'Klang Valley',        'Termites, cockroaches, rats. Certified & insured.', 0, 'seed', now()),

    -- Renovation
    ('sup_seed_rv1',  uid, 'RenoMates KL',                  '60173890122', 'renovation',    'KL / PJ / Ampang',    'Minor works, repainting, tiling, carpentry. Free quote.', 0, 'seed', now())

  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Seeded % contacts for user %', 11, uid;
END $$;
