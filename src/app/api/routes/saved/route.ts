import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '../../../utils/supabase-server';

// GET /api/routes/saved — list saved routes for user
export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedClient();

    const { data: savedRoutes, error } = await supabase
      .from('saved_routes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with station names
    const allStationIds = new Set<string>();
    (savedRoutes || []).forEach((r: any) => {
      (r.all_station_ids || []).forEach((id: string) => allStationIds.add(id));
    });

    let stationMap: Record<string, any> = {};
    if (allStationIds.size > 0) {
      const { data: stations } = await supabase
        .from('stations')
        .select('id, name, loc_name')
        .in('id', Array.from(allStationIds));

      (stations || []).forEach((s: any) => {
        stationMap[s.id] = s;
      });
    }

    const enriched = (savedRoutes || []).map((route: any) => {
      const startStation = stationMap[route.start_station_id];
      const endStation = stationMap[route.end_station_id];
      const stationNames = (route.all_station_ids || [])
        .map((id: string) => stationMap[id]?.loc_name || stationMap[id]?.name || '?')

      return {
        ...route,
        start_station_name: startStation?.loc_name || startStation?.name || '?',
        end_station_name: endStation?.loc_name || endStation?.name || '?',
        station_names: stationNames,
      };
    });

    return NextResponse.json({ savedRoutes: enriched });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get saved routes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/routes/saved — save a new route template
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedClient();

    const body = await request.json();
    const { name, allStationIds, startStationId, endStationId } = body;

    if (!name || !allStationIds || !Array.isArray(allStationIds) || allStationIds.length < 2) {
      return NextResponse.json({ error: 'name and allStationIds (min 2) are required' }, { status: 400 });
    }

    if (!startStationId || !endStationId) {
      return NextResponse.json({ error: 'startStationId and endStationId are required' }, { status: 400 });
    }

    const { data: savedRoute, error } = await supabase
      .from('saved_routes')
      .insert({
        user_id: user.id,
        name,
        all_station_ids: allStationIds,
        start_station_id: startStationId,
        end_station_id: endStationId,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, savedRoute });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Save route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
