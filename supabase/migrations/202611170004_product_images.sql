alter table public.menu_items add column image_url text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,1048576,array['image/png','image/jpeg','image/webp'])
on conflict(id) do nothing;
