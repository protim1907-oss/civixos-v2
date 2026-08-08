-- Allow Washington, D.C. (DC) districts through the profiles registration gate.
--
-- D.C. is not a state: it has a single at-large congressional district, which
-- the U.S. Census geocoder codes as 98 — so D.C. residents resolve to "DC-98".
-- This adds DC to the allowed set alongside the existing jurisdictions.
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

  -- District codes look like "TX-35", "MD-01", "DC-98"; take the state prefix.
  prefix := upper(split_part(btrim(NEW.district), '-', 1));

  IF prefix IN ('TX', 'CA', 'IL', 'MD', 'CO', 'NV', 'OH', 'GA', 'MI', 'NY', 'VA', 'NC', 'PA', 'FL', 'DC') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Civix250 registration is limited to TX, CA, IL, MD, CO, NV, OH, GA, MI, NY, VA, NC, PA, FL, and DC districts (got %)',
    NEW.district
    USING ERRCODE = 'check_violation';
END;
$$;
