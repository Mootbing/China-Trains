-- Full schema for 高铁成龙 (China Trains)
-- Pulled from remote Supabase project yhcndfgwamzxobsbgefy on 2026-03-28

---------------------------------------------------------------------------
-- Extensions
---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

---------------------------------------------------------------------------
-- Custom types
---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.vehicle_type AS ENUM ('locomotive', 'car');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

---------------------------------------------------------------------------
-- Tables
---------------------------------------------------------------------------

-- users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    xp INTEGER NOT NULL DEFAULT 0,
    money NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- stations
CREATE TABLE IF NOT EXISTS public.stations (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    loc_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    CONSTRAINT stations_level_check CHECK (level > 0)
);

-- routes
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_station_id UUID NOT NULL REFERENCES public.stations(id),
    end_station_id UUID NOT NULL REFERENCES public.stations(id),
    all_station_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    all_vehicle_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
    percent_per_hour DOUBLE PRECISION,
    CONSTRAINT chk_route_array_start CHECK (all_station_ids[1] = start_station_id),
    CONSTRAINT chk_route_array_end CHECK (all_station_ids[array_length(all_station_ids, 1)] = end_station_id)
);

-- vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    model TEXT NOT NULL,
    type public.vehicle_type NOT NULL,
    station_id UUID REFERENCES public.stations(id),
    route_id UUID REFERENCES public.routes(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT vehicles_check CHECK (
        ((station_id IS NOT NULL)::integer + (route_id IS NOT NULL)::integer) = 1
    )
);

---------------------------------------------------------------------------
-- Indexes
---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS stations_user_id_idx ON public.stations USING btree (user_id);
CREATE INDEX IF NOT EXISTS routes_user_id_idx ON public.routes USING btree (user_id);
CREATE INDEX IF NOT EXISTS routes_start_station_id_idx ON public.routes USING btree (start_station_id);
CREATE INDEX IF NOT EXISTS routes_end_station_id_idx ON public.routes USING btree (end_station_id);
CREATE INDEX IF NOT EXISTS vehicles_user_id_idx ON public.vehicles USING btree (user_id);
CREATE INDEX IF NOT EXISTS vehicles_station_id_idx ON public.vehicles USING btree (station_id);
CREATE INDEX IF NOT EXISTS vehicles_route_id_idx ON public.vehicles USING btree (route_id);

---------------------------------------------------------------------------
-- Functions
---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_station_id UUID;
BEGIN
  -- Create user row with starter money
  INSERT INTO public.users (id, xp, money, created_at, updated_at)
  VALUES (NEW.id, 0, 10000, NOW(), NOW());

  -- Create starter station: Tianjin
  INSERT INTO public.stations (id, user_id, name, level, created_at, updated_at, loc_name, latitude, longitude)
  VALUES (gen_random_uuid(), NEW.id, 'Tianjin', 1, NOW(), NOW(), '天津', 39.0851, 117.1994);

  -- Create starter station: Beijing (capture id for vehicles)
  INSERT INTO public.stations (id, user_id, name, level, created_at, updated_at, loc_name, latitude, longitude)
  VALUES (gen_random_uuid(), NEW.id, 'Beijing', 1, NOW(), NOW(), '北京', 39.9042, 116.4074)
  RETURNING id INTO new_station_id;

  -- Starter vehicles at Beijing station: 18x YZ cars
  INSERT INTO public.vehicles (id, user_id, model, type, station_id, created_at, updated_at)
  SELECT gen_random_uuid(), NEW.id, 'YZ', 'car'::public.vehicle_type, new_station_id, NOW(), NOW()
  FROM generate_series(1, 18);

  -- Starter vehicles at Beijing station: 2x HXD1 locomotives
  INSERT INTO public.vehicles (id, user_id, model, type, station_id, created_at, updated_at)
  SELECT gen_random_uuid(), NEW.id, 'HXD1', 'locomotive'::public.vehicle_type, new_station_id, NOW(), NOW()
  FROM generate_series(1, 2);

  -- Starter vehicles at Beijing station: 1x CRH2A locomotive
  INSERT INTO public.vehicles (id, user_id, model, type, station_id, created_at, updated_at)
  VALUES (gen_random_uuid(), NEW.id, 'CRH2A', 'locomotive'::public.vehicle_type, new_station_id, NOW(), NOW());

  -- Starter vehicles at Beijing station: 1x CRH3C locomotive
  INSERT INTO public.vehicles (id, user_id, model, type, station_id, created_at, updated_at)
  VALUES (gen_random_uuid(), NEW.id, 'CRH3C', 'locomotive'::public.vehicle_type, new_station_id, NOW(), NOW());

  -- Starter vehicles at Beijing station: 1x CRH1A locomotive
  INSERT INTO public.vehicles (id, user_id, model, type, station_id, created_at, updated_at)
  VALUES (gen_random_uuid(), NEW.id, 'CRH1A', 'locomotive'::public.vehicle_type, new_station_id, NOW(), NOW());

  -- Starter vehicles at Beijing station: 1x CR450BF locomotive
  INSERT INTO public.vehicles (id, user_id, model, type, station_id, created_at, updated_at)
  VALUES (gen_random_uuid(), NEW.id, 'CR450BF', 'locomotive'::public.vehicle_type, new_station_id, NOW(), NOW());

  -- Starter vehicles at Beijing station: 1x cheat locomotive
  INSERT INTO public.vehicles (id, user_id, model, type, station_id, created_at, updated_at)
  VALUES (gen_random_uuid(), NEW.id, 'cheat', 'locomotive'::public.vehicle_type, new_station_id, NOW(), NOW());

  RETURN NEW;
END;
$function$;

---------------------------------------------------------------------------
-- Triggers
---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
