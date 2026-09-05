-- Allow Alaska (AK), Delaware (DE), North Dakota (ND), South Dakota (SD),
-- Vermont (VT), and Wyoming (WY) districts through the profiles registration
-- gate. These are single at-large states — their sole congressional district is
-- coded XX-00. This completes the map: all 50 states + DC (51 jurisdictions).
-- Run once in the Supabase Dashboard → SQL Editor. The trigger stays in place;
-- only the function body is replaced.

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

  IF prefix IN ('TX','CA','IL','MD','CO','NV','OH','GA','MI','NY','VA','NC','PA','FL','DC','NJ','AZ','WA','WI','MA','TN','IN','MN','MO','SC','AL','LA','KY','OR','CT','OK','UT','IA','AR','MS','KS','NM','WV','ID','HI','NE','ME','NH','RI','MT','AK','DE','ND','SD','VT','WY') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Civix250 registration is limited to the currently supported jurisdictions (got %)',
    NEW.district
    USING ERRCODE = 'check_violation';
END;
$$;
