do $$
declare
  v_pro record;
  v_pro_id uuid;
begin
  for v_pro in
    select * from (values
      ('Sparkle Cleaning',  'Cleaning',                  'تنظيف',         'home',    'cleaning', 6,  120),
      ('Crystal Home',      'Home Cleaning',             'تنظيف منزلي',   'home',    'cleaning', 7,  120),
      ('FreshFold',         'Laundry & Dry Cleaning',    'غسيل وكي',      'home',    'laundry',  2,  60),
      ('BugAway Pro',       'Pest Control',              'مكافحة حشرات',  'home',    'pest',     25, 60),
      ('ColorWorks',        'Painting',                  'دهان',          'home',    'painting', 45, 180),
      ('Padel Pro Court',   'Padel Court (90 min)',      'ملعب بادل',     'sports',  'padel',    25, 90),
      ('Smash Padel Club',  'Padel Court (90 min)',      'ملعب بادل',     'sports',  'padel',    22, 90),
      ('Goal Arena',        'Football Field (1 hr)',     'ملعب كرة قدم',  'sports',  'football', 35, 60),
      ('IronHouse Gym',     'Gym Day Pass',              'صالة رياضية',   'sports',  'gym',      10, 90),
      ('AquaClub',          'Swimming Pool Visit',       'حمام سباحة',    'sports',  'swim',     12, 90),
      ('Ace Tennis',        'Tennis Court (1 hr)',       'ملعب تنس',      'sports',  'tennis',   18, 60),
      ('Dr. Karam Dental',  'Dental Visit',              'زيارة أسنان',   'medical', 'dentist',  30, 30),
      ('Smile Studio',      'Dental Visit',              'زيارة أسنان',   'medical', 'dentist',  28, 30),
      ('ClearVision',       'Eye Exam',                  'فحص نظر',       'medical', 'optician', 20, 30),
      ('Biolab Amman',      'Lab Test',                  'فحص مخبري',     'medical', 'lab',      12, 15),
      ('Classic Barber',    'Barber Visit',              'حلاقة',         'beauty',  'barber',   8,  30),
      ('The Cut Co.',       'Premium Cut',               'قص شعر',        'beauty',  'barber',   10, 30),
      ('Glow Salon',        'Salon Visit',               'صالون',         'beauty',  'salon',    18, 60),
      ('Hammam Al-Andalus', 'Turkish Bath',              'حمام تركي',     'beauty',  'hammam',   35, 90),
      ('Serenity Spa',      'Spa Treatment',             'سبا',           'beauty',  'spa',      40, 60)
    ) as t(full_name, name_en, name_ar, category, subcategory, price, duration_mins)
  loop
    select id into v_pro_id from public.users
      where role = 'pro' and full_name = v_pro.full_name limit 1;

    if v_pro_id is null then
      insert into public.users (full_name, role)
      values (v_pro.full_name, 'pro')
      returning id into v_pro_id;

      insert into public.wallets (user_id) values (v_pro_id);
    end if;

    if not exists (
      select 1 from public.services
      where pro_id = v_pro_id and name_en = v_pro.name_en
    ) then
      insert into public.services (pro_id, name_en, name_ar, category, subcategory, price, duration_mins, is_active)
      values (v_pro_id, v_pro.name_en, v_pro.name_ar, v_pro.category, v_pro.subcategory, v_pro.price, v_pro.duration_mins, true);
    end if;
  end loop;
end$$;