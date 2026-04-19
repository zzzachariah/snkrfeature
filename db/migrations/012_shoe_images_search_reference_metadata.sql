alter table shoe_images
add column if not exists search_provider text,
add column if not exists search_model text,
add column if not exists search_used boolean not null default false,
add column if not exists reference_summary text,
add column if not exists reference_image_url text;
