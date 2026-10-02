create or replace function public.bootstrap_restaurant(
  p_restaurant_name text,
  p_slug text,
  p_owner_name text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare v_restaurant_id uuid; v_zone_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if exists (select 1 from public.restaurant_members where user_id = auth.uid()) then
    raise exception using errcode = 'P0001', message = 'MEMBERSHIP_ALREADY_EXISTS';
  end if;
  if exists (select 1 from public.restaurants) then
    raise exception using errcode = '42501', message = 'RESTAURANT_ALREADY_BOOTSTRAPPED';
  end if;
  if char_length(trim(p_restaurant_name)) not between 1 and 120
     or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or char_length(trim(p_owner_name)) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'INVALID_SETUP_DATA';
  end if;

  insert into public.restaurants (name, slug)
  values (trim(p_restaurant_name), p_slug)
  returning id into v_restaurant_id;

  insert into public.restaurant_members (restaurant_id, user_id, role, display_name)
  values (v_restaurant_id, auth.uid(), 'OWNER', trim(p_owner_name));
  insert into public.restaurant_settings (restaurant_id) values (v_restaurant_id);
  insert into public.zones (restaurant_id, name, sort_order)
  values (v_restaurant_id, 'Main Dining', 0)
  returning id into v_zone_id;

  insert into public.categories (restaurant_id, name, sort_order) values
    (v_restaurant_id, 'แนะนำ', 0),
    (v_restaurant_id, 'เนื้อ', 10),
    (v_restaurant_id, 'หมู', 20),
    (v_restaurant_id, 'ทะเล', 30),
    (v_restaurant_id, 'ผัก', 40),
    (v_restaurant_id, 'ของทานเล่น', 50),
    (v_restaurant_id, 'เครื่องดื่ม', 60),
    (v_restaurant_id, 'ของหวาน', 70);

  return v_restaurant_id;
end;
$$;

grant execute on function public.bootstrap_restaurant(text, text, text) to authenticated;
