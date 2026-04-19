alter table shoe_images
add column if not exists generation_path text,
add column if not exists reference_image_attached boolean,
add column if not exists reference_image_mime_type text,
add column if not exists reference_image_bytes integer;
