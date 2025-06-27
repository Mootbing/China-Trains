-- Fix the trigger function to work with the new schema
-- Run this in your Supabase SQL Editor

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the corrected function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table with the correct structure
  INSERT INTO public.users (id, xp, money, created_at, updated_at)
  VALUES (NEW.id, 0, 10000, NOW(), NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own data" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Add latitude and longitude columns to stations table
ALTER TABLE stations ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE stations ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add index for better performance on location queries
CREATE INDEX IF NOT EXISTS idx_stations_location ON stations(latitude, longitude); 