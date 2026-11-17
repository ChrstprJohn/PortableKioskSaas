create table public.menu_categories (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 60),
 created_at timestamptz not null default now()
);
create unique index category_name_per_business on public.menu_categories(business_id,lower(name));
alter table public.menu_categories enable row level security;
revoke all on public.menu_categories from anon,authenticated;
grant select on public.menu_categories to authenticated;
create policy category_read on public.menu_categories for select to authenticated using(public.can_read_business(business_id));
insert into public.menu_categories(business_id,name) select distinct on (business_id,lower(category)) business_id,category from public.menu_items;
create function public.ensure_menu_category() returns trigger language plpgsql set search_path='' as $$
begin
 insert into public.menu_categories(business_id,name) values(new.business_id,new.category) on conflict do nothing;
 return new;
end;
$$;
create trigger menu_category_saved after insert or update of category on public.menu_items for each row execute function public.ensure_menu_category();
