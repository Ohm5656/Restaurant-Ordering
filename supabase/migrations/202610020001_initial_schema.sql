create extension if not exists pgcrypto;

create type public.staff_role as enum ('OWNER', 'ADMIN', 'STAFF', 'KITCHEN');
create type public.session_status as enum ('OPEN', 'CLOSED');
create type public.order_status as enum ('NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');
create type public.staff_call_type as enum ('ASSISTANCE', 'BILL');
create type public.staff_call_status as enum ('OPEN', 'ACKNOWLEDGED', 'CLOSED');
create type public.payment_method as enum ('CASH', 'TRANSFER', 'CARD', 'OTHER');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_url text,
  contact_number text,
  address text,
  currency text not null default 'THB',
  timezone text not null default 'Asia/Bangkok',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_members (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.staff_role not null,
  display_name text not null check (char_length(display_name) between 1 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);

create table public.restaurant_settings (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  allow_notes boolean not null default true,
  enable_staff_call boolean not null default true,
  enable_bill_request boolean not null default true,
  enable_stock_tracking boolean not null default true,
  show_sold_out_items boolean not null default true,
  require_payment_before_close boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 40),
  capacity integer not null default 4 check (capacity between 1 and 100),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  table_id uuid not null references public.restaurant_tables(id) on delete restrict,
  token_hash text not null unique check (char_length(token_hash) = 64),
  qr_token text not null check (char_length(qr_token) >= 32),
  status public.session_status not null default 'OPEN',
  guest_count integer check (guest_count between 1 and 100),
  opened_at timestamptz not null default now(),
  opened_by uuid references auth.users(id) on delete set null,
  bill_requested_at timestamptz,
  payment_confirmed_at timestamptz,
  payment_method public.payment_method,
  closed_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint closed_session_has_timestamp check (
    (status = 'OPEN' and closed_at is null) or
    (status = 'CLOSED' and closed_at is not null)
  )
);

create unique index one_open_session_per_table
  on public.table_sessions(table_id) where status = 'OPEN';

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  price_satang integer not null check (price_satang >= 0),
  image_path text,
  recommended boolean not null default false,
  available boolean not null default true,
  track_stock boolean not null default false,
  stock_quantity integer check (stock_quantity >= 0),
  low_stock_threshold integer check (low_stock_threshold >= 0),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracked_stock_has_quantity check (
    not track_stock or stock_quantity is not null
  )
);

create table public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  required boolean not null default false,
  min_selections integer not null default 0 check (min_selections >= 0),
  max_selections integer not null default 1 check (max_selections >= 1),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint valid_modifier_selection_range check (min_selections <= max_selections)
);

create table public.modifiers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  group_id uuid not null references public.modifier_groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  price_delta_satang integer not null default 0,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.menu_item_modifier_groups (
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  modifier_group_id uuid not null references public.modifier_groups(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (menu_item_id, modifier_group_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  table_session_id uuid not null references public.table_sessions(id) on delete restrict,
  status public.order_status not null default 'NEW',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  menu_item_id uuid not null references public.menu_items(id) on delete restrict,
  menu_name_snapshot text not null,
  unit_price_satang_snapshot integer not null check (unit_price_satang_snapshot >= 0),
  quantity integer not null check (quantity between 1 and 99),
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);

create table public.order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  modifier_id uuid references public.modifiers(id) on delete set null,
  modifier_name_snapshot text not null,
  price_delta_satang_snapshot integer not null default 0,
  unique (order_item_id, modifier_id)
);

create table public.staff_calls (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  table_session_id uuid not null references public.table_sessions(id) on delete restrict,
  type public.staff_call_type not null,
  status public.staff_call_status not null default 'OPEN',
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  closed_at timestamptz
);

create index restaurant_members_user_idx on public.restaurant_members(user_id) where active;
create index zones_restaurant_sort_idx on public.zones(restaurant_id, sort_order) where active;
create index tables_restaurant_zone_idx on public.restaurant_tables(restaurant_id, zone_id, sort_order) where active;
create index sessions_restaurant_status_idx on public.table_sessions(restaurant_id, status, opened_at desc);
create index sessions_table_history_idx on public.table_sessions(table_id, opened_at desc);
create index categories_restaurant_sort_idx on public.categories(restaurant_id, sort_order) where active;
create index menu_items_restaurant_category_idx on public.menu_items(restaurant_id, category_id, sort_order) where active;
create index menu_items_low_stock_idx on public.menu_items(restaurant_id, stock_quantity) where active and track_stock;
create index orders_restaurant_status_idx on public.orders(restaurant_id, status, created_at desc);
create index orders_session_idx on public.orders(table_session_id, created_at);
create index order_items_order_idx on public.order_items(order_id);
create index staff_calls_restaurant_open_idx on public.staff_calls(restaurant_id, created_at desc) where status = 'OPEN';
create unique index one_open_call_per_session_type
  on public.staff_calls(table_session_id, type) where status = 'OPEN';

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger restaurants_updated_at before update on public.restaurants
for each row execute function public.set_updated_at();
create trigger settings_updated_at before update on public.restaurant_settings
for each row execute function public.set_updated_at();
create trigger zones_updated_at before update on public.zones
for each row execute function public.set_updated_at();
create trigger tables_updated_at before update on public.restaurant_tables
for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories
for each row execute function public.set_updated_at();
create trigger menu_items_updated_at before update on public.menu_items
for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.has_restaurant_role(
  p_restaurant_id uuid,
  p_roles public.staff_role[] default null
)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurant_members rm
    where rm.restaurant_id = p_restaurant_id
      and rm.user_id = auth.uid()
      and rm.active
      and (p_roles is null or rm.role = any(p_roles))
  );
$$;

alter table public.restaurants enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.zones enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.table_sessions enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.modifier_groups enable row level security;
alter table public.modifiers enable row level security;
alter table public.menu_item_modifier_groups enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_modifiers enable row level security;
alter table public.staff_calls enable row level security;

create policy restaurant_staff_read on public.restaurants for select
using (public.has_restaurant_role(id));
create policy restaurant_owner_update on public.restaurants for update
using (public.has_restaurant_role(id, array['OWNER']::public.staff_role[]));

create policy member_staff_read on public.restaurant_members for select
using (public.has_restaurant_role(restaurant_id));
create policy member_owner_manage on public.restaurant_members for all
using (public.has_restaurant_role(restaurant_id, array['OWNER']::public.staff_role[]))
with check (public.has_restaurant_role(restaurant_id, array['OWNER']::public.staff_role[]));

create policy settings_staff_read on public.restaurant_settings for select
using (public.has_restaurant_role(restaurant_id));
create policy settings_owner_manage on public.restaurant_settings for all
using (public.has_restaurant_role(restaurant_id, array['OWNER']::public.staff_role[]))
with check (public.has_restaurant_role(restaurant_id, array['OWNER']::public.staff_role[]));

create policy zones_staff_read on public.zones for select using (public.has_restaurant_role(restaurant_id));
create policy zones_admin_manage on public.zones for all
using (public.has_restaurant_role(restaurant_id, array['OWNER','ADMIN']::public.staff_role[]))
with check (public.has_restaurant_role(restaurant_id, array['OWNER','ADMIN']::public.staff_role[]));

create policy tables_staff_read on public.restaurant_tables for select using (public.has_restaurant_role(restaurant_id));
create policy tables_admin_manage on public.restaurant_tables for all
using (public.has_restaurant_role(restaurant_id, array['OWNER','ADMIN']::public.staff_role[]))
with check (public.has_restaurant_role(restaurant_id, array['OWNER','ADMIN']::public.staff_role[]));

create policy sessions_staff_read on public.table_sessions for select using (public.has_restaurant_role(restaurant_id));
create policy sessions_ops_update on public.table_sessions for update
using (public.has_restaurant_role(restaurant_id, array['OWNER','ADMIN','STAFF']::public.staff_role[]));

create policy categories_staff_read on public.categories for select using (public.has_restaurant_role(restaurant_id));
create policy categories_admin_manage on public.categories for all
using (public.has_restaurant_role(restaurant_id, array['OWNER','ADMIN']::public.staff_role[]))
with check (public.has_restaurant_role(restaurant_id, array['OWNER','ADMIN']::public.staff_role[]));

create policy menu_staff_read on public.menu_items for select using (public.has_restaurant_role(restaurant_id));
create policy menu_admin_manage on public.menu_items for all
using (public.has_restaurant_role(restaurant_id, array['OWNER','ADMIN']::public.staff_role[]))
with check (public.has_restaurant_role(restaurant_id, array['OWNER','ADMIN']::public.staff_role[]));

create policy modifier_groups_staff_read on public.modifier_groups for select using (public.has_restaurant_role(restaurant_id));
create policy modifier_groups_admin_manage on public.modifier_groups for all
using (public.has_restaurant_role(restaurant_id, array['OWNER','ADMIN']::public.staff_role[]))
with check (public.has_restaurant_role(restaurant_id, array['OWNER','ADMIN']::public.staff_role[]));
create policy modifiers_staff_read on public.modifiers for select using (public.has_restaurant_role(restaurant_id));
create policy modifiers_admin_manage on public.modifiers for all
using (public.has_restaurant_role(restaurant_id, array['OWNER','ADMIN']::public.staff_role[]))
with check (public.has_restaurant_role(restaurant_id, array['OWNER','ADMIN']::public.staff_role[]));
create policy menu_modifier_staff_read on public.menu_item_modifier_groups for select
using (exists (
  select 1 from public.menu_items mi
  where mi.id = menu_item_id and public.has_restaurant_role(mi.restaurant_id)
));
create policy menu_modifier_admin_manage on public.menu_item_modifier_groups for all
using (exists (
  select 1 from public.menu_items mi
  where mi.id = menu_item_id and public.has_restaurant_role(mi.restaurant_id, array['OWNER','ADMIN']::public.staff_role[])
));

create policy orders_staff_read on public.orders for select using (public.has_restaurant_role(restaurant_id));
create policy orders_ops_update on public.orders for update
using (public.has_restaurant_role(restaurant_id, array['OWNER','ADMIN','STAFF','KITCHEN']::public.staff_role[]));
create policy order_items_staff_read on public.order_items for select using (public.has_restaurant_role(restaurant_id));
create policy order_modifiers_staff_read on public.order_item_modifiers for select
using (exists (
  select 1 from public.order_items oi
  where oi.id = order_item_id and public.has_restaurant_role(oi.restaurant_id)
));
create policy calls_staff_read on public.staff_calls for select using (public.has_restaurant_role(restaurant_id));
create policy calls_ops_update on public.staff_calls for update
using (public.has_restaurant_role(restaurant_id, array['OWNER','ADMIN','STAFF']::public.staff_role[]));

create or replace function public.open_table(
  p_table_id uuid,
  p_guest_count integer default null
)
returns table(session_id uuid, token text)
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_table public.restaurant_tables%rowtype;
  v_token text;
  v_session_id uuid;
begin
  select * into v_table from public.restaurant_tables where id = p_table_id and active for update;
  if not found then raise exception using errcode = 'P0001', message = 'TABLE_NOT_FOUND'; end if;
  if not public.has_restaurant_role(v_table.restaurant_id, array['OWNER','ADMIN','STAFF']::public.staff_role[]) then
    raise exception using errcode = '42501', message = 'PERMISSION_DENIED';
  end if;
  if exists (select 1 from public.table_sessions where table_id = p_table_id and status = 'OPEN') then
    raise exception using errcode = 'P0001', message = 'TABLE_ALREADY_OPEN';
  end if;
  if p_guest_count is not null and (p_guest_count < 1 or p_guest_count > 100) then
    raise exception using errcode = '22023', message = 'INVALID_GUEST_COUNT';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  insert into public.table_sessions (
    restaurant_id, table_id, token_hash, qr_token, guest_count, opened_by
  ) values (
    v_table.restaurant_id, v_table.id, encode(digest(v_token, 'sha256'), 'hex'), v_token, p_guest_count, auth.uid()
  ) returning id into v_session_id;

  return query select v_session_id, v_token;
end;
$$;

create or replace function public.close_table(
  p_session_id uuid,
  p_payment_method public.payment_method default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_session public.table_sessions%rowtype;
  v_require_payment boolean;
begin
  select * into v_session from public.table_sessions where id = p_session_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'SESSION_NOT_FOUND'; end if;
  if not public.has_restaurant_role(v_session.restaurant_id, array['OWNER','ADMIN','STAFF']::public.staff_role[]) then
    raise exception using errcode = '42501', message = 'PERMISSION_DENIED';
  end if;
  if v_session.status <> 'OPEN' then raise exception using errcode = 'P0001', message = 'SESSION_ALREADY_CLOSED'; end if;
  select require_payment_before_close into v_require_payment
  from public.restaurant_settings where restaurant_id = v_session.restaurant_id;
  if v_require_payment and p_payment_method is null then
    raise exception using errcode = 'P0001', message = 'PAYMENT_CONFIRMATION_REQUIRED';
  end if;

  update public.table_sessions
  set status = 'CLOSED', closed_at = now(), closed_by = auth.uid(),
      payment_confirmed_at = case when p_payment_method is null then payment_confirmed_at else now() end,
      payment_method = coalesce(p_payment_method, payment_method)
  where id = p_session_id;
end;
$$;

create or replace function public.submit_customer_order(
  p_token text,
  p_items jsonb
)
returns uuid
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_session public.table_sessions%rowtype;
  v_settings public.restaurant_settings%rowtype;
  v_order_id uuid;
  v_item jsonb;
  v_menu public.menu_items%rowtype;
  v_order_item_id uuid;
  v_quantity integer;
  v_note text;
  v_modifier_id uuid;
  v_modifier public.modifiers%rowtype;
  v_group public.modifier_groups%rowtype;
  v_selection_count integer;
begin
  if p_token is null or char_length(p_token) < 32 then
    raise exception using errcode = '22023', message = 'INVALID_SESSION';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception using errcode = '22023', message = 'INVALID_ORDER';
  end if;

  select * into v_session
  from public.table_sessions
  where token_hash = encode(digest(p_token, 'sha256'), 'hex') and status = 'OPEN'
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'SESSION_CLOSED_OR_INVALID'; end if;
  if v_session.bill_requested_at is not null then
    raise exception using errcode = 'P0001', message = 'BILL_ALREADY_REQUESTED';
  end if;
  select * into v_settings from public.restaurant_settings where restaurant_id = v_session.restaurant_id;

  insert into public.orders (restaurant_id, table_session_id)
  values (v_session.restaurant_id, v_session.id)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    begin
      v_quantity := (v_item->>'quantity')::integer;
      v_note := case when v_settings.allow_notes then nullif(trim(v_item->>'note'), '') else null end;
      select * into v_menu
      from public.menu_items
      where id = (v_item->>'menu_item_id')::uuid
        and restaurant_id = v_session.restaurant_id
        and active and available
      for update;
    exception when others then
      raise exception using errcode = '22023', message = 'INVALID_ORDER_ITEM';
    end;

    if not found then raise exception using errcode = 'P0001', message = 'ITEM_UNAVAILABLE'; end if;
    if v_quantity is null or v_quantity < 1 or v_quantity > 99 then
      raise exception using errcode = '22023', message = 'INVALID_QUANTITY';
    end if;
    if v_note is not null and char_length(v_note) > 300 then
      raise exception using errcode = '22023', message = 'NOTE_TOO_LONG';
    end if;
    if v_menu.track_stock and coalesce(v_menu.stock_quantity, 0) < v_quantity then
      raise exception using errcode = 'P0001', message = 'INSUFFICIENT_STOCK';
    end if;

    for v_group in
      select mg.*
      from public.modifier_groups mg
      join public.menu_item_modifier_groups mig on mig.modifier_group_id = mg.id
      where mig.menu_item_id = v_menu.id and mg.active
    loop
      select count(*) into v_selection_count
      from jsonb_array_elements_text(coalesce(v_item->'modifier_ids', '[]'::jsonb)) selected(id)
      join public.modifiers m on m.id = selected.id::uuid
      where m.group_id = v_group.id and m.active;
      if v_selection_count < v_group.min_selections or v_selection_count > v_group.max_selections then
        raise exception using errcode = '22023', message = 'INVALID_MODIFIER_SELECTION';
      end if;
    end loop;

    insert into public.order_items (
      restaurant_id, order_id, menu_item_id, menu_name_snapshot,
      unit_price_satang_snapshot, quantity, note
    ) values (
      v_session.restaurant_id, v_order_id, v_menu.id, v_menu.name,
      v_menu.price_satang, v_quantity, v_note
    ) returning id into v_order_item_id;

    for v_modifier_id in
      select value::uuid from jsonb_array_elements_text(coalesce(v_item->'modifier_ids', '[]'::jsonb))
    loop
      select m.* into v_modifier
      from public.modifiers m
      join public.menu_item_modifier_groups mig on mig.modifier_group_id = m.group_id
      where m.id = v_modifier_id and mig.menu_item_id = v_menu.id
        and m.restaurant_id = v_session.restaurant_id and m.active;
      if not found then raise exception using errcode = '22023', message = 'INVALID_MODIFIER'; end if;

      insert into public.order_item_modifiers (
        order_item_id, modifier_id, modifier_name_snapshot, price_delta_satang_snapshot
      ) values (
        v_order_item_id, v_modifier.id, v_modifier.name, v_modifier.price_delta_satang
      );
    end loop;

    if v_menu.track_stock then
      update public.menu_items
      set stock_quantity = stock_quantity - v_quantity
      where id = v_menu.id;
    end if;
  end loop;

  return v_order_id;
end;
$$;

create or replace function public.create_customer_request(
  p_token text,
  p_type public.staff_call_type
)
returns uuid
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_session public.table_sessions%rowtype;
  v_call_id uuid;
  v_settings public.restaurant_settings%rowtype;
begin
  select * into v_session from public.table_sessions
  where token_hash = encode(digest(p_token, 'sha256'), 'hex') and status = 'OPEN'
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'SESSION_CLOSED_OR_INVALID'; end if;
  select * into v_settings from public.restaurant_settings where restaurant_id = v_session.restaurant_id;
  if (p_type = 'ASSISTANCE' and not v_settings.enable_staff_call)
     or (p_type = 'BILL' and not v_settings.enable_bill_request) then
    raise exception using errcode = '42501', message = 'FEATURE_DISABLED';
  end if;

  if p_type = 'BILL' then
    update public.table_sessions set bill_requested_at = coalesce(bill_requested_at, now()) where id = v_session.id;
  end if;

  insert into public.staff_calls (restaurant_id, table_session_id, type)
  values (v_session.restaurant_id, v_session.id, p_type)
  on conflict (table_session_id, type) where status = 'OPEN'
  do update set created_at = excluded.created_at
  returning id into v_call_id;
  return v_call_id;
end;
$$;

create or replace function public.transition_order(
  p_order_id uuid,
  p_status public.order_status
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND'; end if;
  if not public.has_restaurant_role(v_order.restaurant_id, array['OWNER','ADMIN','STAFF','KITCHEN']::public.staff_role[]) then
    raise exception using errcode = '42501', message = 'PERMISSION_DENIED';
  end if;
  if not (
    (v_order.status = 'NEW' and p_status in ('ACCEPTED','CANCELLED')) or
    (v_order.status = 'ACCEPTED' and p_status in ('PREPARING','CANCELLED')) or
    (v_order.status = 'PREPARING' and p_status in ('READY','CANCELLED')) or
    (v_order.status = 'READY' and p_status = 'SERVED')
  ) then raise exception using errcode = 'P0001', message = 'INVALID_STATUS_TRANSITION'; end if;

  if p_status = 'CANCELLED' then
    update public.menu_items mi
    set stock_quantity = mi.stock_quantity + oi.quantity
    from public.order_items oi
    where oi.order_id = v_order.id and oi.menu_item_id = mi.id and mi.track_stock;
  end if;

  update public.orders set
    status = p_status,
    updated_by = auth.uid(),
    accepted_at = case when p_status = 'ACCEPTED' then now() else accepted_at end,
    preparing_at = case when p_status = 'PREPARING' then now() else preparing_at end,
    ready_at = case when p_status = 'READY' then now() else ready_at end,
    served_at = case when p_status = 'SERVED' then now() else served_at end,
    cancelled_at = case when p_status = 'CANCELLED' then now() else cancelled_at end
  where id = v_order.id;
end;
$$;

create or replace function public.get_session_bill(p_session_id uuid)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select case when public.has_restaurant_role(ts.restaurant_id) then jsonb_build_object(
    'session_id', ts.id,
    'table_name', rt.name,
    'restaurant_name', r.name,
    'opened_at', ts.opened_at,
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'name', oi.menu_name_snapshot,
      'quantity', oi.quantity,
      'unit_price_satang', oi.unit_price_satang_snapshot,
      'modifier_total_satang', coalesce(mods.total, 0)
    ) order by oi.created_at) filter (where oi.id is not null), '[]'::jsonb),
    'total_satang', coalesce(sum((oi.unit_price_satang_snapshot + coalesce(mods.total, 0)) * oi.quantity), 0)
  ) else null end
  from public.table_sessions ts
  join public.restaurant_tables rt on rt.id = ts.table_id
  join public.restaurants r on r.id = ts.restaurant_id
  left join public.orders o on o.table_session_id = ts.id and o.status <> 'CANCELLED'
  left join public.order_items oi on oi.order_id = o.id
  left join lateral (
    select sum(oim.price_delta_satang_snapshot) as total
    from public.order_item_modifiers oim where oim.order_item_id = oi.id
  ) mods on true
  where ts.id = p_session_id
  group by ts.id, rt.name, r.name;
$$;

revoke all on all tables in schema public from anon;
grant usage on schema public to anon, authenticated;
grant execute on function public.submit_customer_order(text, jsonb) to anon, authenticated;
grant execute on function public.create_customer_request(text, public.staff_call_type) to anon, authenticated;
grant execute on function public.open_table(uuid, integer) to authenticated;
grant execute on function public.close_table(uuid, public.payment_method) to authenticated;
grant execute on function public.transition_order(uuid, public.order_status) to authenticated;
grant execute on function public.get_session_bill(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('restaurant-assets', 'restaurant-assets', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;

create policy restaurant_assets_public_read on storage.objects for select
using (bucket_id = 'restaurant-assets');
create policy restaurant_assets_staff_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'restaurant-assets'
  and public.has_restaurant_role((storage.foldername(name))[1]::uuid, array['OWNER','ADMIN']::public.staff_role[])
);
create policy restaurant_assets_staff_update on storage.objects for update to authenticated
using (
  bucket_id = 'restaurant-assets'
  and public.has_restaurant_role((storage.foldername(name))[1]::uuid, array['OWNER','ADMIN']::public.staff_role[])
);
create policy restaurant_assets_staff_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'restaurant-assets'
  and public.has_restaurant_role((storage.foldername(name))[1]::uuid, array['OWNER','ADMIN']::public.staff_role[])
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.table_sessions;
    alter publication supabase_realtime add table public.orders;
    alter publication supabase_realtime add table public.staff_calls;
    alter publication supabase_realtime add table public.menu_items;
  end if;
exception when duplicate_object then null;
end $$;
