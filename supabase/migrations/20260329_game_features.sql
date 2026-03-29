-- Phase 1: Route completion tracking
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS money_earned NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0;

-- Phase 2: Operating costs
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS operating_cost NUMERIC(14,2) DEFAULT 0;

-- Index for filtering active vs completed routes
CREATE INDEX IF NOT EXISTS idx_routes_completed ON public.routes(completed);

-- Phase 3: Achievements
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    achievement_key TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, achievement_key)
);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.achievements(user_id);

-- Phase 3: Saved routes
CREATE TABLE IF NOT EXISTS public.saved_routes (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    all_station_ids UUID[] NOT NULL,
    start_station_id UUID NOT NULL REFERENCES public.stations(id),
    end_station_id UUID NOT NULL REFERENCES public.stations(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_routes_user ON public.saved_routes(user_id);

-- Phase 3: Cargo/passenger demand
CREATE TABLE IF NOT EXISTS public.station_demands (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
    destination_station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
    demand_type TEXT NOT NULL CHECK (demand_type IN ('passenger', 'freight')),
    quantity INTEGER NOT NULL DEFAULT 0,
    reward_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.5,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_demands_station ON public.station_demands(station_id);

-- RLS policies for new tables
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_demands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON public.achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own saved routes" ON public.saved_routes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved routes" ON public.saved_routes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved routes" ON public.saved_routes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view demands for own stations" ON public.station_demands FOR SELECT
  USING (station_id IN (SELECT id FROM public.stations WHERE user_id = auth.uid()));
