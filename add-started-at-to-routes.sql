-- Migration: Add all_vehicle_ids and started_at to routes table
-- Run this in your Supabase SQL Editor after the initial setup

-- Add all_vehicle_ids column to routes table (if not already exists)
ALTER TABLE public.routes 
ADD COLUMN IF NOT EXISTS all_vehicle_ids UUID[] NOT NULL DEFAULT '{}';

-- Add started_at column to routes table to track when the route was started
ALTER TABLE public.routes 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();