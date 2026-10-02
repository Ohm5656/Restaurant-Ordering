create or replace function public.set_menu_item_modifiers(
  p_menu_item_id uuid,
  p_groups jsonb
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_group jsonb;
  v_option jsonb;
  v_group_id uuid;
  v_group_position bigint;
  v_option_position bigint;
  v_min integer;
  v_max integer;
  v_option_count integer;
begin
  select restaurant_id into v_restaurant_id
  from public.menu_items
  where id = p_menu_item_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'MENU_ITEM_NOT_FOUND';
  end if;
  if not public.has_restaurant_role(
    v_restaurant_id,
    array['OWNER','ADMIN']::public.staff_role[]
  ) then
    raise exception using errcode = '42501', message = 'PERMISSION_DENIED';
  end if;
  if jsonb_typeof(coalesce(p_groups, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'INVALID_MODIFIER_GROUPS';
  end if;

  with removed as (
    delete from public.menu_item_modifier_groups
    where menu_item_id = p_menu_item_id
    returning modifier_group_id
  )
  delete from public.modifier_groups mg
  using removed
  where mg.id = removed.modifier_group_id
    and not exists (
      select 1 from public.menu_item_modifier_groups link
      where link.modifier_group_id = mg.id
    );

  for v_group, v_group_position in
    select value, ordinality
    from jsonb_array_elements(coalesce(p_groups, '[]'::jsonb)) with ordinality
  loop
    v_min := coalesce((v_group->>'minSelections')::integer, 0);
    v_max := coalesce((v_group->>'maxSelections')::integer, 1);
    v_option_count := jsonb_array_length(coalesce(v_group->'options', '[]'::jsonb));

    if char_length(trim(coalesce(v_group->>'name', ''))) not between 1 and 100
      or v_min < 0
      or v_max < 1
      or v_min > v_max
      or v_max > v_option_count
      or v_option_count = 0
    then
      raise exception using errcode = '22023', message = 'INVALID_MODIFIER_GROUP';
    end if;

    insert into public.modifier_groups (
      restaurant_id,
      name,
      required,
      min_selections,
      max_selections,
      sort_order
    ) values (
      v_restaurant_id,
      trim(v_group->>'name'),
      coalesce((v_group->>'required')::boolean, false),
      v_min,
      v_max,
      v_group_position - 1
    ) returning id into v_group_id;

    insert into public.menu_item_modifier_groups (
      menu_item_id,
      modifier_group_id,
      sort_order
    ) values (p_menu_item_id, v_group_id, v_group_position - 1);

    for v_option, v_option_position in
      select value, ordinality
      from jsonb_array_elements(v_group->'options') with ordinality
    loop
      if char_length(trim(coalesce(v_option->>'name', ''))) not between 1 and 100
        or coalesce((v_option->>'priceDeltaSatang')::integer, 0) not between -10000000 and 10000000
      then
        raise exception using errcode = '22023', message = 'INVALID_MODIFIER_OPTION';
      end if;

      insert into public.modifiers (
        restaurant_id,
        group_id,
        name,
        price_delta_satang,
        sort_order
      ) values (
        v_restaurant_id,
        v_group_id,
        trim(v_option->>'name'),
        coalesce((v_option->>'priceDeltaSatang')::integer, 0),
        v_option_position - 1
      );
    end loop;
  end loop;
end;
$$;

create or replace function public.acknowledge_staff_call(p_call_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare v_call public.staff_calls%rowtype;
begin
  select * into v_call
  from public.staff_calls
  where id = p_call_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'CALL_NOT_FOUND';
  end if;
  if not public.has_restaurant_role(
    v_call.restaurant_id,
    array['OWNER','ADMIN','STAFF']::public.staff_role[]
  ) then
    raise exception using errcode = '42501', message = 'PERMISSION_DENIED';
  end if;
  if v_call.status <> 'OPEN' then
    return;
  end if;

  update public.staff_calls
  set status = 'ACKNOWLEDGED', acknowledged_at = now(), acknowledged_by = auth.uid()
  where id = p_call_id;
end;
$$;

grant execute on function public.set_menu_item_modifiers(uuid, jsonb) to authenticated;
grant execute on function public.acknowledge_staff_call(uuid) to authenticated;
