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

### 3. Create Shows Table
```sql
-- Copy contents from: supabase/migrations/003_create_shows_table.sql
```

### 4. Add Profile Locations
```sql
-- Copy contents from: supabase/migrations/004_add_profile_locations.sql
```

## Step 2: Verify Setup

After running the migrations, verify everything is working:

1. **Check Profiles Table**: In Supabase → Table Editor, you should see a `profiles` table with location fields (latitude, longitude, location_address)
2. **Check Shows Table**: In Supabase → Table Editor, you should see a `shows` table
3. **Check Storage Bucket**: In Supabase → Storage, you should see an `avatars` bucket
4. **Check RLS Policies**: In Supabase → Authentication → Policies, you should see policies for `profiles`, `shows`, and `storage.objects`

## Step 3: Test the Profile Page

1. Run the app: `npm run dev`
2. Go to: http://localhost:3000/auth/login
3. Sign in/create an account
4. Navigate to: http://localhost:3000/profile
5. Test:
   - Fill out profile information and save
   - Navigate away and back to verify persistence
   - Upload a profile photo

## Step 4: Test Show Creation

1. Create a host account (or set user_type to 'host' in profiles table)
2. Add location to your profile (latitude, longitude fields)
3. Go to: http://localhost:3000/create-show
4. Test:
   - Fill out show details
   - View the nearby musicians map
   - Click on musician pins to select them
   - Search and select a musician (optional)
   - Create the show and verify it appears in bookings

## Common Issues & Solutions

### Issue: "Permission denied" when saving profile
**Solution**: Make sure the RLS policies are applied correctly. Check that the policies in the SQL editor match what was created.

### Issue: "Storage bucket not found" when uploading photo
**Solution**: Make sure the `avatars` bucket was created successfully. Check the Storage section in Supabase.

### Issue: Photos don't display after upload
**Solution**: Ensure the bucket is set to public and the RLS policies allow public access for SELECT operations.

### Issue: "Error creating show" or "Permission denied" when creating show
**Solution**: Make sure the `shows` table exists and RLS policies are applied correctly. Hosts should be able to insert shows with their host_id.

### Issue: Musician search not working
**Solution**: Ensure there are musician profiles in the profiles table (user_type = 'musician') and that the RLS policies allow reading profiles.

### Issue: Map not showing musicians
**Solution**: Make sure host profile has latitude/longitude values and that musician profiles have location data. Verify the MAPBOX_TOKEN environment variable is set.

### Issue: "Location not available" on create show
**Solution**: Add latitude and longitude values to your profile in the profiles table.

## Manual SQL Commands

If you prefer to run the commands manually:

```sql
-- Check if profiles table exists
SELECT * FROM information_schema.tables WHERE table_name = 'profiles';

-- Check if shows table exists
SELECT * FROM information_schema.tables WHERE table_name = 'shows';

-- Check if avatars bucket exists
SELECT * FROM storage.buckets WHERE name = 'avatars';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('profiles', 'objects', 'shows');
```

## Need Help?

If you encounter any issues:

1. Check the Supabase logs: Project → Logs
2. Verify your `.env.local` has the correct Supabase URL and keys
3. Make sure you're using the service_role key for admin operations
