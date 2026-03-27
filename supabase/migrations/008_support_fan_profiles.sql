-- Allow fan user type in profiles
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_user_type_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN ('musician', 'host', 'fan'));

-- Ensure new auth users always get a profiles row
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  derived_name TEXT;
  derived_user_type TEXT;
BEGIN
  derived_name := COALESCE(
    NULLIF(TRIM(CONCAT(
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      ' ',
      COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    )), ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
    'HouseShow User'
  );

  derived_user_type := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'user_type', ''),
    NULLIF(NEW.raw_user_meta_data->>'role', ''),
    'fan'
  );

  INSERT INTO public.profiles (id, name, user_type)
  VALUES (NEW.id, derived_name, derived_user_type)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();
