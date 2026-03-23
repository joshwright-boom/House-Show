# Database Setup Guide

This guide will help you set up the Supabase database and storage for the HouseShow profile functionality.

## Prerequisites

1. You have a Supabase project created
2. You have your service_role key added to `.env.local`

## Step 1: Apply Database Migrations

Run the following SQL commands in your Supabase SQL Editor (Project → SQL Editor):

### 1. Create Profiles Table
```sql
-- Copy contents from: supabase/migrations/001_create_profiles.sql
```

### 2. Create Avatars Storage Bucket
```sql
-- Copy contents from: supabase/migrations/002_create_avatars_bucket.sql
```

## Step 2: Verify Setup

After running the migrations, verify everything is working:

1. **Check Profiles Table**: In Supabase → Table Editor, you should see a `profiles` table
2. **Check Storage Bucket**: In Supabase → Storage, you should see an `avatars` bucket
3. **Check RLS Policies**: In Supabase → Authentication → Policies, you should see policies for both `profiles` and `storage.objects`

## Step 3: Test the Profile Page

1. Run the app: `npm run dev`
2. Go to: http://localhost:3000/auth/login
3. Sign in/create an account
4. Navigate to: http://localhost:3000/profile
5. Test:
   - Fill out profile information and save
   - Navigate away and back to verify persistence
   - Upload a profile photo

## Common Issues & Solutions

### Issue: "Permission denied" when saving profile
**Solution**: Make sure the RLS policies are applied correctly. Check that the policies in the SQL editor match what was created.

### Issue: "Storage bucket not found" when uploading photo
**Solution**: Make sure the `avatars` bucket was created successfully. Check the Storage section in Supabase.

### Issue: Photos don't display after upload
**Solution**: Ensure the bucket is set to public and the RLS policies allow public access for SELECT operations.

## Manual SQL Commands

If you prefer to run the commands manually:

```sql
-- Check if profiles table exists
SELECT * FROM information_schema.tables WHERE table_name = 'profiles';

-- Check if avatars bucket exists
SELECT * FROM storage.buckets WHERE name = 'avatars';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('profiles', 'objects');
```

## Need Help?

If you encounter any issues:

1. Check the Supabase logs: Project → Logs
2. Verify your `.env.local` has the correct Supabase URL and keys
3. Make sure you're using the service_role key for admin operations
