alter table shoe_images
add column if not exists source_image_url text,
add column if not exists source_domain text,
add column if not exists source_type text check (source_type in ('official', 'retailer', 'review_media', 'unknown')),
add column if not exists selection_reason text;

alter table shoe_images
alter column provider set default 'SerpApi';
