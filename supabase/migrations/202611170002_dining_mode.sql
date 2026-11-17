alter table public.kiosk_orders add column dining_mode text not null default 'takeout'
check (dining_mode in ('dine_in','takeout'));
