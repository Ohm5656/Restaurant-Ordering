create or replace function public.reorder_category(
  p_category_id uuid,
  p_direction integer
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_current public.categories%rowtype;
  v_adjacent public.categories%rowtype;
begin
  if p_direction not in (-1, 1) then
    raise exception using errcode = '22023', message = 'INVALID_DIRECTION';
  end if;
  select * into v_current from public.categories where id = p_category_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'CATEGORY_NOT_FOUND'; end if;
  if not public.has_restaurant_role(v_current.restaurant_id, array['OWNER','ADMIN']::public.staff_role[]) then
    raise exception using errcode = '42501', message = 'PERMISSION_DENIED';
  end if;

  if p_direction = -1 then
    select * into v_adjacent from public.categories
    where restaurant_id = v_current.restaurant_id and active
      and (sort_order, id) < (v_current.sort_order, v_current.id)
    order by sort_order desc, id desc limit 1 for update;
  else
    select * into v_adjacent from public.categories
    where restaurant_id = v_current.restaurant_id and active
      and (sort_order, id) > (v_current.sort_order, v_current.id)
    order by sort_order, id limit 1 for update;
  end if;
  if not found then return; end if;

  update public.categories set sort_order = v_adjacent.sort_order where id = v_current.id;
  update public.categories set sort_order = v_current.sort_order where id = v_adjacent.id;
end;
$$;

create or replace function public.reorder_zone(
  p_zone_id uuid,
  p_direction integer
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_current public.zones%rowtype;
  v_adjacent public.zones%rowtype;
begin
  if p_direction not in (-1, 1) then
    raise exception using errcode = '22023', message = 'INVALID_DIRECTION';
  end if;
  select * into v_current from public.zones where id = p_zone_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'ZONE_NOT_FOUND'; end if;
  if not public.has_restaurant_role(v_current.restaurant_id, array['OWNER','ADMIN']::public.staff_role[]) then
    raise exception using errcode = '42501', message = 'PERMISSION_DENIED';
  end if;

  if p_direction = -1 then
    select * into v_adjacent from public.zones
    where restaurant_id = v_current.restaurant_id and active
      and (sort_order, id) < (v_current.sort_order, v_current.id)
    order by sort_order desc, id desc limit 1 for update;
  else
    select * into v_adjacent from public.zones
    where restaurant_id = v_current.restaurant_id and active
      and (sort_order, id) > (v_current.sort_order, v_current.id)
    order by sort_order, id limit 1 for update;
  end if;
  if not found then return; end if;

  update public.zones set sort_order = v_adjacent.sort_order where id = v_current.id;
  update public.zones set sort_order = v_current.sort_order where id = v_adjacent.id;
end;
$$;

create or replace function public.get_table_board(p_restaurant_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not public.has_restaurant_role(p_restaurant_id) then
    raise exception using errcode = '42501', message = 'PERMISSION_DENIED';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', rt.id,
      'name', rt.name,
      'seats', rt.capacity,
      'zone_id', z.id,
      'zone_name', z.name,
      'session_id', ts.id,
      'opened_at', ts.opened_at,
      'guest_count', ts.guest_count,
      'state', case
        when ts.id is null then 'AVAILABLE'
        when ts.bill_requested_at is not null then 'REQUEST_BILL'
        when exists (select 1 from public.staff_calls sc where sc.table_session_id = ts.id and sc.type = 'ASSISTANCE' and sc.status = 'OPEN') then 'CALLING_STAFF'
        when exists (select 1 from public.orders o where o.table_session_id = ts.id and o.status = 'READY') then 'READY'
        when exists (select 1 from public.orders o where o.table_session_id = ts.id and o.status = 'NEW') then 'NEW_ORDER'
        when exists (select 1 from public.orders o where o.table_session_id = ts.id and o.status in ('ACCEPTED','PREPARING')) then 'PREPARING'
        else 'ACTIVE'
      end,
      'total_satang', coalesce((
        select sum((oi.unit_price_satang_snapshot + coalesce(mods.total, 0)) * oi.quantity)
        from public.orders o
        join public.order_items oi on oi.order_id = o.id
        left join lateral (
          select sum(oim.price_delta_satang_snapshot) total
          from public.order_item_modifiers oim where oim.order_item_id = oi.id
        ) mods on true
        where o.table_session_id = ts.id and o.status <> 'CANCELLED'
      ), 0),
      'attention_count',
        coalesce((select count(*) from public.orders o where o.table_session_id = ts.id and o.status in ('NEW','READY')), 0)
        + coalesce((select count(*) from public.staff_calls sc where sc.table_session_id = ts.id and sc.status = 'OPEN'), 0),
      'latest_items', coalesce((
        select jsonb_agg(recent.menu_name_snapshot order by recent.created_at desc)
        from (
          select oi.menu_name_snapshot, oi.created_at
          from public.orders o
          join public.order_items oi on oi.order_id = o.id
          where o.table_session_id = ts.id
            and o.status in ('NEW','ACCEPTED','PREPARING','READY')
          order by oi.created_at desc
          limit 2
        ) recent
      ), '[]'::jsonb)
    ) order by z.sort_order, rt.sort_order, rt.name)
    from public.restaurant_tables rt
    join public.zones z on z.id = rt.zone_id and z.active
    left join public.table_sessions ts on ts.table_id = rt.id and ts.status = 'OPEN'
    where rt.restaurant_id = p_restaurant_id and rt.active
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.reorder_category(uuid, integer) to authenticated;
grant execute on function public.reorder_zone(uuid, integer) to authenticated;
