-- Create profiles table for user data
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  name text not null,
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Function to handle new user creation
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create products table
create table public.products (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  price decimal(10,2) not null check (price >= 0),
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

alter table public.products enable row level security;

create policy "Users can view their own products"
  on public.products for select
  using (auth.uid() = user_id);

create policy "Users can create their own products"
  on public.products for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own products"
  on public.products for update
  using (auth.uid() = user_id);

create policy "Users can delete their own products"
  on public.products for delete
  using (auth.uid() = user_id);

-- Create clients table
create table public.clients (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

alter table public.clients enable row level security;

create policy "Users can view their own clients"
  on public.clients for select
  using (auth.uid() = user_id);

create policy "Users can create their own clients"
  on public.clients for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own clients"
  on public.clients for update
  using (auth.uid() = user_id);

create policy "Users can delete their own clients"
  on public.clients for delete
  using (auth.uid() = user_id);

-- Create orders table
create table public.orders (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  order_date timestamp with time zone not null default now(),
  delivered boolean not null default false,
  total_amount decimal(10,2) not null default 0,
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

alter table public.orders enable row level security;

create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Users can create their own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own orders"
  on public.orders for update
  using (auth.uid() = user_id);

create policy "Users can delete their own orders"
  on public.orders for delete
  using (auth.uid() = user_id);

-- Create order_items table (many-to-many between orders and products)
create table public.order_items (
  id uuid not null default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  price decimal(10,2) not null check (price >= 0),
  subtotal decimal(10,2) not null check (subtotal >= 0),
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

alter table public.order_items enable row level security;

create policy "Users can view order items for their orders"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

create policy "Users can create order items for their orders"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

create policy "Users can update order items for their orders"
  on public.order_items for update
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

create policy "Users can delete order items for their orders"
  on public.order_items for delete
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );