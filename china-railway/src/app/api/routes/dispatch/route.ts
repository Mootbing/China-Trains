import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { vehicleIds, allStationIds, startStationId, endStationId } = body;

    // Validate input
    if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return NextResponse.json({ error: 'Vehicle IDs are required' }, { status: 400 });
    }

    if (!allStationIds || !Array.isArray(allStationIds) || allStationIds.length < 2) {
      return NextResponse.json({ error: 'At least 2 stations are required for a route' }, { status: 400 });
    }

    if (!startStationId || !endStationId) {
      return NextResponse.json({ error: 'Start and end station IDs are required' }, { status: 400 });
    }

    // Generate UUID for the route
    const now = new Date().toISOString();
    const { data: routeData, error: routeError } = await supabase
      .from('routes')
      .insert({
        user_id: user.id,
        all_station_ids: allStationIds,
        all_vehicle_ids: vehicleIds,
        start_station_id: startStationId,
        end_station_id: endStationId,
        started_at: now,
        created_at: now,
        updated_at: now
      })
      .select('id')
      .single();

    if (routeError) {
      console.error('Error creating route:', routeError);
      return NextResponse.json({ error: 'Failed to create route' }, { status: 500 });
    }

    const routeId = routeData.id;

    // Update vehicles: set station_id to null and route_id to the new route ID
    const { error: vehicleUpdateError } = await supabase
      .from('vehicles')
      .update({
        station_id: null,
        route_id: routeId,
        updated_at: new Date().toISOString()
      })
      .in('id', vehicleIds)
      .eq('user_id', user.id);

    if (vehicleUpdateError) {
      console.error('Error updating vehicles:', vehicleUpdateError);
      // Try to cleanup the route if vehicle update failed
      await supabase.from('routes').delete().eq('id', routeId);
      return NextResponse.json({ error: 'Failed to update vehicles' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      routeId,
      message: 'Train dispatched successfully' 
    });

  } catch (error) {
    console.error('Dispatch train error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 