-- Bucket de imágenes de productos de tienda (público lectura, admin escritura)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-products',
  'store-products',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS store_products_storage_public_read ON storage.objects;
CREATE POLICY store_products_storage_public_read ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'store-products');

DROP POLICY IF EXISTS store_products_storage_admin_write ON storage.objects;
CREATE POLICY store_products_storage_admin_write ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'store-products' AND public.is_admin())
  WITH CHECK (bucket_id = 'store-products' AND public.is_admin());
