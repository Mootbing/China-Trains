-- Add missing RLS policies for station_demands insert, delete, update
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert demands for own stations' AND tablename = 'station_demands') THEN
    CREATE POLICY "Users can insert demands for own stations" ON public.station_demands
      FOR INSERT WITH CHECK (
        station_id IN (SELECT id FROM public.stations WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete demands for own stations' AND tablename = 'station_demands') THEN
    CREATE POLICY "Users can delete demands for own stations" ON public.station_demands
      FOR DELETE USING (
        station_id IN (SELECT id FROM public.stations WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update demands for own stations' AND tablename = 'station_demands') THEN
    CREATE POLICY "Users can update demands for own stations" ON public.station_demands
      FOR UPDATE USING (
        station_id IN (SELECT id FROM public.stations WHERE user_id = auth.uid())
      );
  END IF;
END $$;
