delete from public.district_representatives
where district_code = 'CA-42'
  and name in (
    'Robert Garcia',
    'Alex Padilla',
    'Adam Schiff',
    'Gavin Newsom',
    'Rob Bonta'
  );

insert into public.district_representatives (
  district_code,
  state,
  district_number,
  name,
  title,
  office_label,
  party,
  website,
  contact_url,
  phone,
  image_url,
  is_active
)
values
  (
    'CA-42',
    'California',
    42,
    'Robert Garcia',
    'U.S. Representative',
    'CA-42',
    'Democrat',
    'https://robertgarcia.house.gov/',
    'https://robertgarcia.house.gov/contact',
    '(202) 225-7924',
    '',
    true
  ),
  (
    'CA-42',
    'California',
    42,
    'Alex Padilla',
    'U.S. Senator',
    'California',
    'Democrat',
    'https://www.padilla.senate.gov/',
    'https://www.padilla.senate.gov/contact/contact-form/',
    '(202) 224-3553',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Alex_Padilla%2C_official_portrait%2C_117th_Congress.jpg/640px-Alex_Padilla%2C_official_portrait%2C_117th_Congress.jpg',
    true
  ),
  (
    'CA-42',
    'California',
    42,
    'Adam Schiff',
    'U.S. Senator',
    'California',
    'Democrat',
    'https://www.schiff.senate.gov/',
    'https://www.schiff.senate.gov/contact/',
    '(202) 224-3841',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Adam_Schiff%2C_official_portrait%2C_118th_Congress.jpg/640px-Adam_Schiff%2C_official_portrait%2C_118th_Congress.jpg',
    true
  ),
  (
    'CA-42',
    'California',
    42,
    'Gavin Newsom',
    'Governor of California',
    'Statewide Office',
    'Democrat',
    'https://www.gov.ca.gov/',
    'https://www.gov.ca.gov/contact/',
    '(916) 445-2841',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Gavin_Newsom_by_Gage_Skidmore.jpg/640px-Gavin_Newsom_by_Gage_Skidmore.jpg',
    true
  ),
  (
    'CA-42',
    'California',
    42,
    'Rob Bonta',
    'Attorney General of California',
    'Statewide Office',
    'Democrat',
    'https://oag.ca.gov/',
    'https://oag.ca.gov/contact',
    '(916) 445-9555',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Rob_Bonta_official_portrait.jpg/640px-Rob_Bonta_official_portrait.jpg',
    true
  );
