-- Allow Colorado (CO) districts through the profiles registration gate.
--
-- Civix250 enforces its service area with a trigger function on `profiles`
-- (enforce_tx_ca_district) that raises when a district is outside the allowed
-- states. This adds CO to the allowed set alongside TX, CA, IL, and MD.
--
-- Run this in the Supabase Dashboard → SQL Editor. The trigger itself is left
-- in place; only its function body is replaced, so nothing needs re-wiring.

CREATE OR REPLACE FUNCTION public.enforce_tx_ca_district()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  prefix text;
BEGIN
  -- Rows without a district (e.g. pending/statewide) are not gated here.
  IF NEW.district IS NULL OR btrim(NEW.district) = '' THEN
    RETURN NEW;
  END IF;

  -- District codes look like "TX-35", "IL-10", "MD-1", "CO-1"; take the state
  -- prefix.
  prefix := upper(split_part(btrim(NEW.district), '-', 1));

  IF prefix IN ('TX', 'CA', 'IL', 'MD', 'CO') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Civix250 registration is limited to Texas, California, Illinois, Maryland, and Colorado districts (got %)',
    NEW.district
    USING ERRCODE = 'check_violation';
END;
$$;
