-- Allow SVG custom atmosphere logos in site-media (UI accept already includes svg+xml).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm'
]
WHERE id = 'site-media';
