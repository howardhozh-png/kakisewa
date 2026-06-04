-- Wrap the signup trigger in exception handling so a failure in
-- seeding directory contacts never blocks a new user from registering.
CREATE OR REPLACE FUNCTION trg_seed_directory_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  BEGIN
    PERFORM seed_directory_contacts_for_user(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    -- Seed failure must not block account creation
    NULL;
  END;
  RETURN NEW;
END $$;
