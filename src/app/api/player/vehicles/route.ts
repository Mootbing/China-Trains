import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '../../../utils/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedClient();

    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');

    // Get vehicles data
    let query = supabase
      .from('vehicles')
      .select('id, model, type, station_id, route_id')
      .eq('user_id', user.id);

    // If station_id is provided, filter by it; otherwise, fetch all vehicles
    if (stationId) {
      query = query.eq('station_id', stationId);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get vehicles data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
