-- The Lennox Apartments: Supabase booking dashboard setup
-- Run this in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  guest_email text,
  check_in date not null,
  check_out date not null,
  guests text not null,
  apartment_type text,
  guest_message text,
  status text not null default 'new'
    check (status in ('new','contacted','confirmed','cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','refunded','failed')),
  amount_ghs numeric(12,2),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_dates_valid check (check_out > check_in),
  constraint amount_nonnegative check (amount_ghs is null or amount_ghs >= 0)
);

create or replace function public.is_lennox_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

create or replace function public.set_booking_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at
before update on public.bookings
for each row execute function public.set_booking_updated_at();

alter table public.admin_users enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "Admins can view their own admin record" on public.admin_users;
create policy "Admins can view their own admin record"
on public.admin_users for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Public can submit booking requests" on public.bookings;
create policy "Public can submit booking requests"
on public.bookings for insert to anon, authenticated
with check (
  status = 'new'
  and payment_status = 'unpaid'
  and amount_ghs is null
  and admin_notes is null
  and check_out > check_in
  and length(trim(guest_name)) between 1 and 160
);

drop policy if exists "Admins can read all bookings" on public.bookings;
create policy "Admins can read all bookings"
on public.bookings for select to authenticated
using (public.is_lennox_admin());

drop policy if exists "Admins can update bookings" on public.bookings;
create policy "Admins can update bookings"
on public.bookings for update to authenticated
using (public.is_lennox_admin())
with check (public.is_lennox_admin());

drop policy if exists "Admins can delete bookings" on public.bookings;
create policy "Admins can delete bookings"
on public.bookings for delete to authenticated
using (public.is_lennox_admin());

grant usage on schema public to anon, authenticated;
grant insert on public.bookings to anon, authenticated;
grant select, update, delete on public.bookings to authenticated;
grant select on public.admin_users to authenticated;
grant execute on function public.is_lennox_admin() to authenticated;

-- After creating your admin login under Authentication > Users, add that user:
-- Admin login email supplied for this setup. First create this user in
-- Supabase Authentication > Users, then run the statement below.
insert into public.admin_users (user_id)
select id from auth.users where email = 'bethanyham01@gmail.com'
on conflict (user_id) do nothing;
