-- Allow New Jersey (NJ) and Arizona (AZ) districts through the profiles gate.
--
-- Adds NJ and AZ to the allowed set alongside the existing jurisdictions.
-- Run this once in the Supabase Dashboard → SQL Editor. The trigger stays in
-- place; only the function body is replaced.

CREATE OR REPLACE FUNCTION public.enforce_tx_ca_district()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  prefix text;
BEGIN
  IF NEW.district IS NULL OR btrim(NEW.district) = '' THEN
    RETURN NEW;
  END IF;

  prefix := upper(split_part(btrim(NEW.district), '-', 1));

  IF prefix IN ('TX', 'CA', 'IL', 'MD', 'CO', 'NV', 'OH', 'GA', 'MI', 'NY', 'VA', 'NC', 'PA', 'FL', 'DC', 'NJ', 'AZ') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Civix250 registration is limited to TX, CA, IL, MD, CO, NV, OH, GA, MI, NY, VA, NC, PA, FL, DC, NJ, and AZ districts (got %)',
    NEW.district
    USING ERRCODE = 'check_violation';
END;
$$;
