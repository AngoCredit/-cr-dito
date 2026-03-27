-- Create the kyc-documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public access to read files (necessary because the app uses getPublicUrl)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'kyc-documents' );

-- Allow authenticated users to upload files
CREATE POLICY "Allow Authenticated Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'kyc-documents' );

-- Allow users to update/delete their own files (using folder-based security)
CREATE POLICY "Allow Individual Updates"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text );

CREATE POLICY "Allow Individual Deletes"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text );
