-- Routes and Vehicles Tables Setup for China Railway
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create routes table
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    all_station_ids UUID[] NOT NULL,
    start_station_id UUID REFERENCES public.stations(id) NOT NULL,
    end_station_id UUID REFERENCES public.stations(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vehicles table  
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    model TEXT NOT NULL,
    type TEXT NOT NULL, -- 'locomotive' or 'car'
    station_id UUID REFERENCES public.stations(id),
    route_id UUID REFERENCES public.routes(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: vehicle can be either at a station OR on a route, but not both
    CONSTRAINT vehicle_location_check CHECK (
        (station_id IS NOT NULL AND route_id IS NULL) OR 
        (station_id IS NULL AND route_id IS NOT NULL)
    )
);

-- Enable Row Level Security
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Create policies for routes table
CREATE POLICY "Users can view their own routes" ON public.routes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own routes" ON public.routes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routes" ON public.routes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routes" ON public.routes
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for vehicles table
CREATE POLICY "Users can view their own vehicles" ON public.vehicles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vehicles" ON public.vehicles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vehicles" ON public.vehicles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vehicles" ON public.vehicles
    FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_routes_updated_at
    BEFORE UPDATE ON public.routes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.routes TO anon, authenticated;
GRANT ALL ON public.vehicles TO anon, authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_routes_user_id ON public.routes(user_id);
CREATE INDEX IF NOT EXISTS idx_routes_start_station ON public.routes(start_station_id);
CREATE INDEX IF NOT EXISTS idx_routes_end_station ON public.routes(end_station_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_station_id ON public.vehicles(station_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_route_id ON public.vehicles(route_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_model ON public.vehicles(model);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON public.vehicles(type);

-- Insert some sample vehicles for testing (optional)
-- Uncomment the following lines if you want to add some sample vehicles

/*
-- Sample locomotive vehicles
INSERT INTO public.vehicles (user_id, model, type, station_id) VALUES
    ((SELECT id FROM auth.users LIMIT 1), 'HXD1', 'locomotive', (SELECT id FROM public.stations LIMIT 1)),
    ((SELECT id FROM auth.users LIMIT 1), 'DF4', 'locomotive', (SELECT id FROM public.stations LIMIT 1)),
    ((SELECT id FROM auth.users LIMIT 1), 'SS9', 'locomotive', (SELECT id FROM public.stations LIMIT 1));

-- Sample car vehicles  
INSERT INTO public.vehicles (user_id, model, type, station_id) VALUES
    ((SELECT id FROM auth.users LIMIT 1), 'YZ', 'car', (SELECT id FROM public.stations LIMIT 1)),
    ((SELECT id FROM auth.users LIMIT 1), 'YZ', 'car', (SELECT id FROM public.stations LIMIT 1)),
    ((SELECT id FROM auth.users LIMIT 1), 'RZ', 'car', (SELECT id FROM public.stations LIMIT 1)),
    ((SELECT id FROM auth.users LIMIT 1), 'YW', 'car', (SELECT id FROM public.stations LIMIT 1)),
    ((SELECT id FROM auth.users LIMIT 1), 'F', 'car', (SELECT id FROM public.stations LIMIT 1));
*/ 