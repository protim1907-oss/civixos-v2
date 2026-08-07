-- Allow Pennsylvania (PA) and Florida (FL) districts through the profiles gate.
--
-- Civix250 enforces its service area with a trigger function on `profiles`
-- (enforce_tx_ca_district) that raises when a district is outside the allowed
-- states. This adds PA and FL to the allowed set alongside TX, CA, IL, MD, CO,
-- NV, OH, GA, MI, NY, VA, and NC.
--
-- Run this once in the Supabase Dashboard → SQL Editor. The trigger itself is
-- left in place; only its function body is replaced, so nothing needs re-wiring.

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

  -- District codes look like "TX-35", "MD-01", "PA-01"; take the state prefix.
  prefix := upper(split_part(btrim(NEW.district), '-', 1));

  IF prefix IN ('TX', 'CA', 'IL', 'MD', 'CO', 'NV', 'OH', 'GA', 'MI', 'NY', 'VA', 'NC', 'PA', 'FL') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Civix250 registration is limited to TX, CA, IL, MD, CO, NV, OH, GA, MI, NY, VA, NC, PA, and FL districts (got %)',
    NEW.district
    USING ERRCODE = 'check_violation';
END;
$$;
