import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const stationName = searchParams.get('name');

    if (stationName) {
      // Check if specific station exists for this user and location
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', stationName)
        .single();

      if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ 
        exists: !!data,
        station: data || null
      });
    } else {
      // Fetch all stations for the current user
      const { data: stations, error } = await supabase
        .from('stations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ 
        stations: stations || []
      });
    }
  } catch (error) {
    console.error('Get station error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

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
    const { name, loc_name, level = 1, latitude, longitude } = body;

    if (!name) {
      return NextResponse.json({ error: 'Station name is required' }, { status: 400 });
    }

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Latitude and longitude must be numbers' }, { status: 400 });
    }

    if (latitude < -90 || latitude > 90) {
      return NextResponse.json({ error: 'Latitude must be between -90 and 90' }, { status: 400 });
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Longitude must be between -180 and 180' }, { status: 400 });
    }

    // Check if user has enough money (10,000 for level 1 station)
    const { data: playerData, error: playerError } = await supabase
      .from('users')
      .select('money')
      .eq('id', user.id)
      .single();

    if (playerError) {
      return NextResponse.json({ error: 'Failed to get player data' }, { status: 500 });
    }

    const stationCost = 10000;
    if (playerData.money < stationCost) {
      return NextResponse.json({ 
        error: 'Insufficient funds',
        required: stationCost,
        available: playerData.money
      }, { status: 400 });
    }

    // Check if station already exists
    const { data: existingStation, error: checkError } = await supabase
      .from('stations')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', name)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingStation) {
      return NextResponse.json({ error: 'Station already exists at this location' }, { status: 400 });
    }

    // Create the station
    const { data: newStation, error: createError } = await supabase
      .from('stations')
      .insert({
        user_id: user.id,
        name,
        loc_name: loc_name || name, // Use loc_name if provided, otherwise use name
        level,
        latitude,
        longitude,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Deduct money from player
    const { error: updateError } = await supabase
      .from('users')
      .update({ money: playerData.money - stationCost })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update player money' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      station: newStation,
      moneySpent: stationCost,
      remainingMoney: playerData.money - stationCost
    });
  } catch (error) {
    console.error('Create station error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 