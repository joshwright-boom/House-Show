-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/*'])
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for avatars bucket
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can view their own avatar" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Create policy for public access to avatars (since bucket is public)
CREATE POLICY "Public avatar access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
  );

-- Create function to set up avatars policies (called from the app)
CREATE OR REPLACE FUNCTION create_avatars_policies()
RETURNS void AS $$
BEGIN
  -- Policies are already created above
  -- This function exists for the app to call it
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
