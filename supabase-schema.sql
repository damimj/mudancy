-- ============================================================
-- Mudancy — Supabase schema
--
-- Run it once in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- It is safe to run again later (every statement is idempotent), e.g. after
-- pulling a new version of Mudancy.
-- ============================================================

-- 1. ADMINS ---------------------------------------------------
-- The list of e-mail addresses allowed to manage the shop. Nobody can read
-- or change this table through the public API (RLS is on, no policies):
-- you edit it from the SQL Editor, which bypasses RLS.
create table if not exists admins (
  email text primary key check (email = lower(email))
);
alter table admins enable row level security;

-- True when the signed-in user's e-mail is in the admins table.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function is_admin() to anon, authenticated;

-- Only addresses in the admins table can create an account, so strangers
-- cannot sign up (or make Supabase send e-mails) even though the login
-- form is public.
create or replace function enforce_admin_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins where email = lower(new.email)) then
    raise exception 'This e-mail address is not allowed to sign in.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_admin_signup on auth.users;
create trigger enforce_admin_signup
  before insert on auth.users
  for each row execute function enforce_admin_signup();

-- 2. CATEGORIES -----------------------------------------------
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists category_translations (
  category_id uuid not null references categories(id) on delete cascade,
  lang        text not null check (lang ~ '^[a-z]{2,3}$'),
  name        text not null,
  primary key (category_id, lang)
);

-- 3. PRODUCTS -------------------------------------------------
create table if not exists products (
  id             uuid primary key default gen_random_uuid(),
  category_id    uuid references categories(id) on delete set null,
  price          numeric(12, 2) not null default 0 check (price >= 0),
  currency       text not null default 'USD',
  images         text[] not null default '{}',
  available_from date,
  original_link  text,
  status         text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Title, description and condition live here, one row per language.
create table if not exists product_translations (
  product_id  uuid not null references products(id) on delete cascade,
  lang        text not null check (lang ~ '^[a-z]{2,3}$'),
  title       text not null,
  description text not null default '',
  condition   text not null default '',
  primary key (product_id, lang)
);

-- 4. RESERVATIONS (buyer contact info, visible only to admins) --
create table if not exists reservations (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  first_name   text not null,
  last_name    text not null,
  phone        text not null,
  created_at   timestamptz not null default now()
);

-- Indexes -------------------------------------------------------
create index if not exists idx_products_category_id    on products(category_id);
create index if not exists idx_products_status         on products(status);
create index if not exists idx_reservations_product_id on reservations(product_id);

-- updated_at trigger --------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- Row Level Security --------------------------------------------
-- Access model:
--   - categories, products and their translations: readable by everyone
--     (public catalog), writable only by admins.
--   - reservations: readable only by admins; never directly writable by
--     anyone — created only through reserve_product() below.
alter table categories             enable row level security;
alter table category_translations  enable row level security;
alter table products               enable row level security;
alter table product_translations   enable row level security;
alter table reservations           enable row level security;

drop policy if exists "categories_select" on categories;
create policy "categories_select" on categories for select using (true);
drop policy if exists "categories_admin_write" on categories;
create policy "categories_admin_write" on categories for all
  using (is_admin()) with check (is_admin());

drop policy if exists "category_translations_select" on category_translations;
create policy "category_translations_select" on category_translations for select using (true);
drop policy if exists "category_translations_admin_write" on category_translations;
create policy "category_translations_admin_write" on category_translations for all
  using (is_admin()) with check (is_admin());

drop policy if exists "products_select" on products;
create policy "products_select" on products for select using (true);
drop policy if exists "products_admin_write" on products;
create policy "products_admin_write" on products for all
  using (is_admin()) with check (is_admin());

drop policy if exists "product_translations_select" on product_translations;
create policy "product_translations_select" on product_translations for select using (true);
drop policy if exists "product_translations_admin_write" on product_translations;
create policy "product_translations_admin_write" on product_translations for all
  using (is_admin()) with check (is_admin());

drop policy if exists "reservations_admin_select" on reservations;
create policy "reservations_admin_select" on reservations for select
  using (is_admin());

-- Reservation RPC -----------------------------------------------
-- Atomically reserves a product: fails if it is not currently 'available'
-- (prevents two visitors from reserving the same item in a race), then
-- records the buyer's contact info. Callable by anyone (anon clients).
create or replace function reserve_product(
  p_product_id uuid,
  p_first_name text,
  p_last_name  text,
  p_phone      text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  update products
    set status = 'reserved'
    where id = p_product_id and status = 'available';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'PRODUCT_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  insert into reservations (product_id, first_name, last_name, phone)
    values (p_product_id, p_first_name, p_last_name, p_phone);
end;
$$;

grant execute on function reserve_product(uuid, text, text, text) to anon, authenticated;

-- Storage bucket for product photos -------------------------------
insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict do nothing;

-- Public read; only admins can upload/delete.
drop policy if exists "product_images_select" on storage.objects;
create policy "product_images_select" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_write" on storage.objects;
create policy "product_images_admin_write" on storage.objects
  for all using (bucket_id = 'product-images' and is_admin())
  with check (bucket_id = 'product-images' and is_admin());

-- Starter categories (edit or delete them later in the admin panel) ----
with seed(slug, position) as (
  values ('furniture', 1), ('electronics', 2), ('kitchen', 3), ('clothing', 4), ('other', 5)
)
insert into categories (slug, position)
select slug, position from seed
on conflict (slug) do nothing;

with seed(slug, lang, name) as (
  values
    ('furniture',   'en', 'Furniture'),   ('furniture',   'es', 'Muebles'),
    ('electronics', 'en', 'Electronics'), ('electronics', 'es', 'Electrónica'),
    ('kitchen',     'en', 'Kitchen'),     ('kitchen',     'es', 'Cocina'),
    ('clothing',    'en', 'Clothing'),    ('clothing',    'es', 'Ropa'),
    ('other',       'en', 'Other'),       ('other',       'es', 'Otros')
)
insert into category_translations (category_id, lang, name)
select c.id, s.lang, s.name
from seed s
join categories c on c.slug = s.slug
on conflict (category_id, lang) do nothing;
