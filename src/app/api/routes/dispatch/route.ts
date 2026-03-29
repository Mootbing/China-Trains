import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createAuthenticatedClient } from '../../../utils/supabase-server';
import {
  calculateRouteDistance,
  calculateTrainMetrics,
  calculateOperatingCost,
  Station,
  Vehicle,
} from '../../../utils/route-utils';

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedClient();

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

    // Load vehicle JSON data for cost calculation
    const locomotivesPath = path.join(process.cwd(), 'public/assets/data/locomotives.json');
    const carsPath = path.join(process.cwd(), 'public/assets/data/cars.json');
    const locomotivesData = JSON.parse(await fs.readFile(locomotivesPath, 'utf8'));
    const carsData = JSON.parse(await fs.readFile(carsPath, 'utf8'));

    // Fetch station data for distance calculation
    const { data: stations, error: stationsError } = await supabase
      .from('stations')
      .select('*')
      .eq('user_id', user.id)
      .in('id', allStationIds);

    if (stationsError) {
      return NextResponse.json({ error: stationsError.message }, { status: 500 });
    }

    const stationMap: Record<string, Station> = {};
    (stations || []).forEach(s => { stationMap[s.id] = s; });
    const orderedStations = allStationIds.map((id: string) => stationMap[id]).filter(Boolean);

    if (orderedStations.length < 2) {
      return NextResponse.json({ error: 'Could not resolve stations' }, { status: 400 });
    }

    const totalDistance = calculateRouteDistance(orderedStations);

    // Fetch vehicle DB records to get models
    const { data: dbVehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
      .in('id', vehicleIds);

    if (vehiclesError) {
      return NextResponse.json({ error: vehiclesError.message }, { status: 500 });
    }

    // Build enhanced vehicle list for cost calculation
    const enhancedVehicles: Vehicle[] = (dbVehicles || []).map(v => {
      const locoData = locomotivesData.find((l: any) => l.model === v.model);
      const carData = carsData.find((c: any) => c.model === v.model);
      const base = locoData || carData;
      return {
        id: v.id,
        model: v.model,
        type: v.type,
        weight: base?.weight || 0,
        max_speed: base?.max_speed,
        max_weight: base?.max_weight,
      };
    });

    // Calculate operating cost
    const operatingCost = calculateOperatingCost(totalDistance, enhancedVehicles);

    // Check if user has enough money
    const { data: playerData, error: playerError } = await supabase
      .from('users')
      .select('money')
      .eq('id', user.id)
      .single();

    if (playerError) {
      return NextResponse.json({ error: 'Failed to get player data' }, { status: 500 });
    }

    if (playerData.money < operatingCost) {
      return NextResponse.json({
        error: 'Insufficient funds for operating cost',
        required: operatingCost,
        available: playerData.money,
      }, { status: 400 });
    }

    // Deduct operating cost
    const { error: deductError } = await supabase
      .from('users')
      .update({ money: playerData.money - operatingCost })
      .eq('id', user.id);

    if (deductError) {
      return NextResponse.json({ error: 'Failed to deduct operating cost' }, { status: 500 });
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
        operating_cost: operatingCost,
        started_at: now,
        created_at: now,
        updated_at: now
      })
      .select('id')
      .single();

    if (routeError) {
      console.error('Error creating route:', routeError);
      // Refund operating cost if route creation fails
      await supabase
        .from('users')
        .update({ money: playerData.money })
        .eq('id', user.id);
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
      // Refund operating cost
      await supabase
        .from('users')
        .update({ money: playerData.money })
        .eq('id', user.id);
      return NextResponse.json({ error: 'Failed to update vehicles' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      routeId,
      operatingCost,
      message: 'Train dispatched successfully'
    });

  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Dispatch train error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
