create or replace function public.get_customer_menu(p_token text)
returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_session public.table_sessions%rowtype;
  v_result jsonb;
begin
  select * into v_session
  from public.table_sessions
  where token_hash = encode(digest(p_token, 'sha256'), 'hex');

  if not found then return null; end if;

  select jsonb_build_object(
    'restaurant', jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'logo_url', r.logo_url
    ),
    'session', jsonb_build_object(
      'id', ts.id,
      'table_name', rt.name,
      'status', ts.status,
      'bill_requested', ts.bill_requested_at is not null
    ),
    'settings', jsonb_build_object(
      'allow_notes', rs.allow_notes,
      'enable_staff_call', rs.enable_staff_call,
      'enable_bill_request', rs.enable_bill_request
    ),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'sort_order', c.sort_order
      ) order by c.sort_order, c.name)
      from public.categories c
      where c.restaurant_id = r.id and c.active
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', mi.id,
        'category_id', mi.category_id,
        'name', mi.name,
        'description', mi.description,
        'price_satang', mi.price_satang,
        'image_path', mi.image_path,
        'recommended', mi.recommended,
        'available', mi.available,
        'sold_out', mi.track_stock and coalesce(mi.stock_quantity, 0) = 0,
        'modifier_groups', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', mg.id,
            'name', mg.name,
            'required', mg.required,
            'min_selections', mg.min_selections,
            'max_selections', mg.max_selections,
            'options', coalesce((
              select jsonb_agg(jsonb_build_object(
                'id', m.id,
                'name', m.name,
                'price_delta_satang', m.price_delta_satang
              ) order by m.sort_order, m.name)
              from public.modifiers m
              where m.group_id = mg.id and m.active
            ), '[]'::jsonb)
          ) order by mig.sort_order, mg.sort_order)
          from public.menu_item_modifier_groups mig
          join public.modifier_groups mg on mg.id = mig.modifier_group_id and mg.active
          where mig.menu_item_id = mi.id
        ), '[]'::jsonb)
      ) order by mi.sort_order, mi.name)
      from public.menu_items mi
      where mi.restaurant_id = r.id and mi.active
        and (mi.available or rs.show_sold_out_items)
    ), '[]'::jsonb)
  ) into v_result
  from public.table_sessions ts
  join public.restaurant_tables rt on rt.id = ts.table_id
  join public.restaurants r on r.id = ts.restaurant_id and r.active
  join public.restaurant_settings rs on rs.restaurant_id = r.id
  where ts.id = v_session.id;

  return v_result;
end;
$$;

create or replace function public.get_customer_orders(p_token text)
returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare v_session public.table_sessions%rowtype;
begin
  select * into v_session
  from public.table_sessions
  where token_hash = encode(digest(p_token, 'sha256'), 'hex');
  if not found then return null; end if;

  return jsonb_build_object(
    'session_status', v_session.status,
    'orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'number', o.order_number,
        'status', o.status,
        'created_at', o.created_at,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'name', oi.menu_name_snapshot,
            'quantity', oi.quantity,
            'note', oi.note,
            'unit_price_satang', oi.unit_price_satang_snapshot,
            'modifiers', coalesce((
              select jsonb_agg(jsonb_build_object(
                'name', oim.modifier_name_snapshot,
                'price_delta_satang', oim.price_delta_satang_snapshot
              )) from public.order_item_modifiers oim where oim.order_item_id = oi.id
            ), '[]'::jsonb)
          ) order by oi.created_at)
          from public.order_items oi where oi.order_id = o.id
        ), '[]'::jsonb)
      ) order by o.created_at desc)
      from public.orders o where o.table_session_id = v_session.id
    ), '[]'::jsonb)
  );
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
        + coalesce((select count(*) from public.staff_calls sc where sc.table_session_id = ts.id and sc.status = 'OPEN'), 0)
    ) order by z.sort_order, rt.sort_order, rt.name)
    from public.restaurant_tables rt
    join public.zones z on z.id = rt.zone_id and z.active
    left join public.table_sessions ts on ts.table_id = rt.id and ts.status = 'OPEN'
    where rt.restaurant_id = p_restaurant_id and rt.active
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_customer_menu(text) to anon, authenticated;
grant execute on function public.get_customer_orders(text) to anon, authenticated;
grant execute on function public.get_table_board(uuid) to authenticated;

create or replace function public.get_session_qr_token(p_session_id uuid)
returns text
language sql stable security definer
set search_path = public
as $$
  select case when public.has_restaurant_role(ts.restaurant_id, array['OWNER','ADMIN','STAFF']::public.staff_role[])
    then ts.qr_token else null end
  from public.table_sessions ts
  where ts.id = p_session_id and ts.status = 'OPEN';
$$;

grant execute on function public.get_session_qr_token(uuid) to authenticated;
