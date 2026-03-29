import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '../../../../utils/supabase-server';
import { generateDemands } from '../../../../utils/demand-generator';

// GET /api/stations/[id]/demands — get active demands for a station
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params;
    const { supabase, user } = await createAuthenticatedClient();

    // Verify station belongs to user
    const { data: station, error: stationError } = await supabase
      .from('stations')
      .select('id')
      .eq('id', stationId)
      .eq('user_id', user.id)
      .single();

    if (stationError || !station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    // Generate demands lazily (fills up to 3 active demands)
    await generateDemands(supabase, user.id, stationId);

    // Fetch active (non-expired) demands for this station
    const now = new Date().toISOString();
    const { data: demands, error: demandsError } = await supabase
      .from('station_demands')
      .select('*')
      .eq('station_id', stationId)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (demandsError) {
      return NextResponse.json({ error: demandsError.message }, { status: 500 });
    }

    // Enrich with destination station names
    const destIds = (demands || []).map((d: any) => d.destination_station_id);
    let destMap: Record<string, any> = {};

    if (destIds.length > 0) {
      const { data: destStations } = await supabase
        .from('stations')
        .select('id, name, loc_name')
        .in('id', destIds);

      (destStations || []).forEach((s: any) => {
        destMap[s.id] = s;
      });
    }

    const enrichedDemands = (demands || []).map((d: any) => {
      const dest = destMap[d.destination_station_id];
      return {
        ...d,
        destination_name: dest?.loc_name || dest?.name || '?',
      };
    });

    return NextResponse.json({ demands: enrichedDemands });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get demands error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
