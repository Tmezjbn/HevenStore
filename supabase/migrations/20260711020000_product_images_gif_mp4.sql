-- Allow GIF (already) + MP4/WebM on product-images; raise size for short clips.
UPDATE storage.buckets
SET
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm'
  ]
WHERE id = 'product-images';
